// ═══════════════════════════════════════════════════════
// AGRI VISION — Direct Ollama Service (Frontend → Ollama)
// Bypasses PHP backend, talks directly to Ollama via Vite proxy
// ═══════════════════════════════════════════════════════

const OLLAMA_BASE = '/ollama'
const MODELS_PREFERENCE = ['gemma3:4b', 'gemma4:latest']
const VISION_MODELS = ['llava:7b', 'llava:latest', 'llava:13b', 'llava']
const TIMEOUT_CHAT = 25000      // 25s for chat
const TIMEOUT_ANALYSIS = 40000  // 40s for analysis
const TIMEOUT_VISION = 90000    // 90s for vision (LLaVA is slow on large images)
const MAX_RETRIES = 1
const TEMPERATURE = 0.5
const TOP_P = 0.9

// ── State ──
let _activeModel = null
let _visionModel = null
let _ollamaReachable = false
let _modelsAvailable = []
let _isWarm = false
let _lastHealthCheck = 0
let _healthCacheTTL = 20000 // 20s

const LANG_NAMES = {
  en: 'English', hi: 'Hindi', ta: 'Tamil',
  te: 'Telugu', mr: 'Marathi', kn: 'Kannada',
}

// ═══════════════════════════════════════════════════════
// HEALTH / DISCOVERY
// ═══════════════════════════════════════════════════════

export async function checkHealth(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && _lastHealthCheck && (now - _lastHealthCheck) < _healthCacheTTL) {
    return {
      status: _activeModel ? 'READY' : _ollamaReachable ? 'MODEL_UNAVAILABLE' : 'OLLAMA_UNAVAILABLE',
      ollama_reachable: _ollamaReachable,
      model_available: !!_activeModel,
      model: _activeModel,
      warm: _isWarm,
      models: _modelsAvailable,
    }
  }

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    _ollamaReachable = true
    _modelsAvailable = (data.models || []).map(m => m.name)

    // Find best text model from preference list
    _activeModel = null
    for (const pref of MODELS_PREFERENCE) {
      if (_modelsAvailable.some(m => m === pref || m === pref + ':latest')) {
        _activeModel = pref
        break
      }
    }
    if (!_activeModel && _modelsAvailable.length > 0) {
      // Pick first non-vision model, or just the first model
      _activeModel = _modelsAvailable.find(m => !m.startsWith('llava')) || _modelsAvailable[0]
    }

    // Find best vision model — match any model starting with 'llava'
    _visionModel = null
    for (const vm of VISION_MODELS) {
      if (_modelsAvailable.some(m => m === vm || m === vm + ':latest')) {
        _visionModel = vm
        break
      }
    }
    // Fallback: find any model with 'llava' in name
    if (!_visionModel) {
      const llavaMatch = _modelsAvailable.find(m => m.toLowerCase().includes('llava'))
      if (llavaMatch) _visionModel = llavaMatch
    }

    _lastHealthCheck = now

    return {
      status: _activeModel ? 'READY' : 'MODEL_UNAVAILABLE',
      ollama_reachable: true,
      model_available: !!_activeModel,
      model: _activeModel,
      vision_model: _visionModel,
      warm: _isWarm,
      models: _modelsAvailable,
    }
  } catch (err) {
    _ollamaReachable = false
    _activeModel = null
    _lastHealthCheck = now
    return {
      status: 'OLLAMA_UNAVAILABLE',
      ollama_reachable: false,
      model_available: false,
      model: null,
      warm: false,
      last_error: err.message,
    }
  }
}

/**
 * Warm up the model with a tiny request
 */
export async function warmUp() {
  if (_isWarm || !_activeModel) return _isWarm
  try {
    const result = await rawChat(
      [{ role: 'user', content: 'Hi' }],
      _activeModel,
      { num_predict: 5, temperature: 0.1 },
      10000
    )
    if (result !== null) {
      _isWarm = true
    }
  } catch {
    // warm-up failure is non-critical
  }
  return _isWarm
}

// ═══════════════════════════════════════════════════════
// RAW OLLAMA COMMUNICATION (single point of contact)
// ═══════════════════════════════════════════════════════

async function rawChat(messages, model, options = {}, timeout = TIMEOUT_CHAT) {
  // Extract image data separately — it goes on the message, NOT in Ollama options
  const imageData = options.images || null
  const { images, ...ollamaOptions } = options

  const body = {
    model: model || _activeModel,
    messages: [...messages],
    stream: false,
    options: {
      num_predict: ollamaOptions.num_predict || 150,
      temperature: ollamaOptions.temperature ?? TEMPERATURE,
      top_p: ollamaOptions.top_p ?? TOP_P,
    },
  }

  // Handle images for multimodal — attach to the LAST user message
  if (imageData && imageData.length > 0) {
    const lastIdx = body.messages.length - 1
    body.messages[lastIdx] = { ...body.messages[lastIdx], images: imageData }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      console.warn(`[Ollama] HTTP ${res.status} from ${model}`)
      return null
    }

    const data = await res.json()
    let content = data?.message?.content || ''

    // Handle thinking models (gemma4 puts answer in thinking field)
    if (!content.trim() && data?.message?.thinking) {
      content = data.message.thinking
    }

    // Strip <think> tags
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    return content || null
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn(`[Ollama] Request timed out after ${timeout}ms`)
    } else {
      console.warn(`[Ollama] Request failed:`, err.message)
      _ollamaReachable = false
    }
    return null
  }
}

/**
 * Call with retry logic
 */
async function callWithRetry(messages, options = {}, timeout = TIMEOUT_CHAT) {
  // Ensure we have a model
  if (!_activeModel) {
    const health = await checkHealth(true)
    if (!health.model_available) return null
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 1000 * attempt)) // backoff
    }
    const result = await rawChat(messages, _activeModel, options, timeout)
    if (result !== null) return result
  }
  return null
}

// ═══════════════════════════════════════════════════════
// PUBLIC AI METHODS
// ═══════════════════════════════════════════════════════

function buildSystemPrompt(language, context = {}) {
  const langName = LANG_NAMES[language] || 'English'
  let prompt = `You are Krishi Saarthi, an expert Indian farm advisor AI. ALWAYS respond directly in ${langName}. Be concise, practical, and helpful (under 100 words). Do not show internal thinking tags or reasoning processes.`

  const parts = []
  if (context.location) parts.push(`Location: ${context.location}`)
  if (context.weather) parts.push(`Weather: ${context.weather}`)
  if (context.crops) parts.push(`Crops: ${context.crops}`)
  if (context.market) parts.push(`Market: ${context.market}`)
  if (context.soil) parts.push(`Soil: ${context.soil}`)
  if (parts.length > 0) prompt += '\nContext:\n' + parts.join('\n')

  return prompt
}

/**
 * Chat with the AI assistant
 */
export async function chat(message, history = [], language = 'en', context = {}) {
  const systemPrompt = buildSystemPrompt(language, context)
  const messages = [{ role: 'system', content: systemPrompt }]

  // Add last 4 history entries
  for (const h of history.slice(-4)) {
    messages.push({ role: h.role || 'user', content: h.content || '' })
  }
  messages.push({ role: 'user', content: message })

  const reply = await callWithRetry(messages, { num_predict: 150 }, TIMEOUT_CHAT)

  if (reply === null) {
    return { reply: null, error: 'AI is processing — please try again.', offline: true }
  }
  return { reply, model: _activeModel }
}

/**
 * Analyze a plant image using LLaVA vision model
 * Falls back to text model description if vision unavailable
 */
export async function analyzePlant(imageBase64, message = '', language = 'en', context = {}) {
  const langName = LANG_NAMES[language] || 'English'

  // Ensure Ollama is reachable and models are discovered
  if (!_ollamaReachable || (!_visionModel && !_activeModel)) {
    const health = await checkHealth(true)
    if (!health.ollama_reachable) return { error: 'Ollama is not running. Start Ollama to use Plant Health Analyzer.', offline: true }
  }

  // Pick the model — prefer llava for image analysis
  const modelToUse = _visionModel || _activeModel
  if (!modelToUse) {
    return { error: 'No AI model found in Ollama. Pull llava:7b for image analysis.', offline: true }
  }

  console.log(`[PlantHealth] Using vision model: ${modelToUse}, Available: [${_modelsAvailable.join(', ')}]`)

  // Build context-enriched prompt
  const contextParts = []
  if (context.location) contextParts.push(`Location: ${context.location}`)
  if (context.weather) contextParts.push(`Current Weather: ${context.weather}`)
  if (context.crops) contextParts.push(`Farmer's Crops: ${context.crops}`)

  const systemPrompt = [
    `You are Krishi Saarthi, an expert Indian agricultural advisor and plant pathologist.`,
    `Analyze the uploaded plant/leaf image carefully.`,
    `Reply ONLY with valid JSON (no markdown, no explanation, no code blocks):`,
    `{`,
    `  "crop": "identified crop name",`,
    `  "disease": "disease name or None if healthy",`,
    `  "confidence": 85,`,
    `  "severity": "Low|Moderate|High|Severe",`,
    `  "summary": "2-3 sentence diagnosis in ${langName}",`,
    `  "organic_treatment": "organic remedy with dosage",`,
    `  "chemical_treatment": "chemical remedy with dosage and brand"`,
    `}`,
    contextParts.length > 0 ? `\nFarmer Context:\n${contextParts.join('\n')}` : '',
  ].join('\n')

  const userMsg = message || 'Look at this plant image. Identify the crop, diagnose any disease, rate the severity, and suggest both organic and chemical treatments.'

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMsg },
  ]

  // Send to Ollama with the image attached
  const reply = await rawChat(
    messages,
    modelToUse,
    { num_predict: 500, images: [imageBase64], temperature: 0.3 },
    TIMEOUT_VISION
  )

  if (reply === null) {
    return { error: `Vision model ${modelToUse} did not respond. It may still be loading.`, offline: true }
  }

  console.log('[PlantHealth] Raw LLaVA response:', reply.substring(0, 300))

  // Robust JSON extraction — LLaVA often wraps in ```json ... ```
  const parsed = extractJSON(reply)
  if (parsed && parsed.crop) {
    return {
      crop: parsed.crop || 'Unknown',
      disease: parsed.disease || 'Unknown',
      confidence: parsed.confidence || 75,
      severity: parsed.severity || 'Moderate',
      summary: parsed.summary || '',
      organic_treatment: parsed.organic_treatment || parsed.organic || '',
      chemical_treatment: parsed.chemical_treatment || parsed.chemical || '',
      ai_generated: true,
      model: modelToUse,
    }
  }

  // If JSON parse failed, return the raw text as a reply for display
  return {
    reply: reply,
    crop: tryExtractField(reply, 'crop'),
    disease: tryExtractField(reply, 'disease'),
    summary: reply.substring(0, 500),
    ai_generated: true,
    model: modelToUse,
  }
}

/** Extract JSON from LLaVA responses that may be wrapped in markdown */
function extractJSON(text) {
  if (!text) return null
  try {
    // Try 1: Direct parse
    return JSON.parse(text.trim())
  } catch { /* continue */ }
  try {
    // Try 2: Extract from ```json ... ``` blocks
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) return JSON.parse(codeBlock[1].trim())
  } catch { /* continue */ }
  try {
    // Try 3: Find first { ... } block
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch { /* continue */ }
  return null
}

/** Try to extract a field value from unstructured text */
function tryExtractField(text, field) {
  const patterns = {
    crop: /(?:crop|plant)[:\s]+["']?([A-Za-z\s/]+)["']?/i,
    disease: /(?:disease|diagnosis|condition)[:\s]+["']?([A-Za-z\s/()]+)["']?/i,
  }
  const match = text.match(patterns[field])
  return match ? match[1].trim().substring(0, 60) : null
}

/**
 * Generate full weather forecast and metrics using Ollama AI
 */
export async function fetchOllamaWeather(locationName, lat, lng) {
  const prompt = `Generate realistic current weather and 7-day agricultural weather forecast for "${locationName}" (Coordinates: ${lat}, ${lng}). 
Reply ONLY as valid JSON in this exact structure, with no extra text or markdown tags:
{
  "temp": 31,
  "humidity": 72,
  "feels_like": 34,
  "precipitation": 0.5,
  "weather_desc": "Partly Cloudy with light breeze",
  "weather_icon": "⛅",
  "wind_speed": 12,
  "soil_moisture_pct": 65,
  "soil_temp_c": 28,
  "forecast": [
    {"date": "Day 1", "temp_max": 33, "temp_min": 23, "rain_mm": 0, "condition": "Sunny"},
    {"date": "Day 2", "temp_max": 32, "temp_min": 24, "rain_mm": 2, "condition": "Light Shower"},
    {"date": "Day 3", "temp_max": 31, "temp_min": 23, "rain_mm": 5, "condition": "Moderate Rain"},
    {"date": "Day 4", "temp_max": 30, "temp_min": 22, "rain_mm": 0, "condition": "Partly Cloudy"},
    {"date": "Day 5", "temp_max": 33, "temp_min": 24, "rain_mm": 0, "condition": "Sunny"},
    {"date": "Day 6", "temp_max": 34, "temp_min": 25, "rain_mm": 0, "condition": "Clear Sky"},
    {"date": "Day 7", "temp_max": 32, "temp_min": 23, "rain_mm": 1, "condition": "Passing Clouds"}
  ],
  "bulletin": "1. Keep drainage open for expected rains on Day 3. 2. Soil moisture is optimal for crop growth. 3. Monitor for fungal spores during humid mornings."
}`

  const messages = [
    { role: 'system', content: 'You are an agricultural meteorology AI. Respond ONLY with valid raw JSON.' },
    { role: 'user', content: prompt }
  ]

  const reply = await callWithRetry(messages, { num_predict: 500, temperature: 0.4 }, TIMEOUT_ANALYSIS)

  if (reply) {
    try {
      const jsonMatch = reply.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return { ...parsed, success: true, is_ollama: true }
      }
    } catch (e) {
      console.warn('[Ollama Weather] JSON parse failed, falling back:', e.message)
    }
  }
  return { success: false, offline: true }
}

/**
 * Generate weather advisory bulletin
 */
export async function generateBulletin(weatherData, locationName, language = 'en', context = {}) {
  const langName = LANG_NAMES[language] || 'English'
  const systemPrompt = buildSystemPrompt(language, context)

  const prompt = `Weather for ${locationName}: ${weatherData}. Provide 3 short bullet points of farming advice in ${langName}. Base advice on this factual weather data.`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]

  const reply = await callWithRetry(messages, { num_predict: 200 }, TIMEOUT_ANALYSIS)
  return { bulletin: reply, offline: reply === null }
}

/**
 * Suggest suitable crops
 */
export async function suggestCrops(soil, season, locationName, language = 'en', context = {}) {
  const langName = LANG_NAMES[language] || 'English'
  const systemPrompt = buildSystemPrompt(language, context)

  const prompt = `Location: ${locationName}, Soil: ${soil}, Season: ${season}. List top 4 suitable crops with 1 sentence each in ${langName}.`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]

  const reply = await callWithRetry(messages, { num_predict: 200 }, TIMEOUT_ANALYSIS)
  return { suggestions: reply, offline: reply === null }
}

/**
 * Explain data in farmer-friendly language
 */
export async function explainData(data, language = 'en', context = {}) {
  const langName = LANG_NAMES[language] || 'English'
  const systemPrompt = buildSystemPrompt(language, context)

  const prompt = `Explain this briefly in ${langName} for a farmer: ${data}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]

  const reply = await callWithRetry(messages, { num_predict: 150 }, TIMEOUT_ANALYSIS)
  return { explanation: reply, offline: reply === null }
}

/**
 * Get current active model
 */
export function getActiveModel() {
  return _activeModel
}

/**
 * Check if service is ready
 */
export function isReady() {
  return _ollamaReachable && _activeModel !== null
}
