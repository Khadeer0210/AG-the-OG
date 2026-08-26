// ═══════════════════════════════════════════════════════
// AGRI VISION — Direct Ollama Service (Frontend → Ollama)
// Bypasses PHP backend, talks directly to Ollama via Vite proxy
// ═══════════════════════════════════════════════════════

const OLLAMA_BASE = '/ollama'
const MODELS_PREFERENCE = ['gemma3:4b', 'gemma4:latest']
const VISION_MODELS = ['llava:7b', 'llava:latest', 'llava:13b']
const TIMEOUT_CHAT = 25000      // 25s for chat
const TIMEOUT_ANALYSIS = 40000  // 40s for analysis
const TIMEOUT_VISION = 50000    // 50s for vision
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
      _activeModel = _modelsAvailable[0]
    }

    // Find best vision model
    _visionModel = null
    for (const vm of VISION_MODELS) {
      if (_modelsAvailable.some(m => m === vm || m === vm + ':latest')) {
        _visionModel = vm
        break
      }
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
  const body = {
    model: model || _activeModel,
    messages,
    stream: false,
    options: {
      num_predict: options.num_predict || 150,
      temperature: options.temperature ?? TEMPERATURE,
      top_p: options.top_p ?? TOP_P,
      ...options,
    },
  }

  // Handle images for multimodal
  if (options.images && options.images.length > 0) {
    const lastIdx = body.messages.length - 1
    body.messages[lastIdx] = { ...body.messages[lastIdx], images: options.images }
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
 * Analyze a plant image (vision)
 */
export async function analyzePlant(imageBase64, message = '', language = 'en', context = {}) {
  const langName = LANG_NAMES[language] || 'English'

  // Use dedicated vision model (llava) for image analysis
  const modelToUse = _visionModel || _activeModel
  if (!modelToUse) {
    const health = await checkHealth(true)
    if (!health.model_available) return { error: 'No AI model available', offline: true }
  }

  const visionPrompt = `You are Krishi Saarthi, an expert Indian farm advisor. Analyze this plant image. Reply ONLY as valid JSON: {"crop":"name","disease":"name or None","confidence":85,"severity":"Low|Moderate|High|Severe","organic_treatment":"brief organic remedy","chemical_treatment":"brief chemical remedy","summary":"summary in ${langName}"}`

  const contextStr = []
  if (context.weather) contextStr.push(`Weather: ${context.weather}`)
  if (context.location) contextStr.push(`Location: ${context.location}`)
  if (context.crop) contextStr.push(`Crop: ${context.crop}`)
  if (context.field) contextStr.push(`Field: ${context.field}`)

  const userMsg = message || 'Identify the plant disease in this image and suggest treatments.'

  const messages = [
    { role: 'system', content: visionPrompt + (contextStr.length ? '\n' + contextStr.join('\n') : '') },
    { role: 'user', content: userMsg },
  ]

  const reply = await rawChat(
    messages,
    _visionModel || modelToUse,
    { num_predict: 400, images: [imageBase64], temperature: 0.3 },
    TIMEOUT_VISION
  )

  if (reply === null) {
    return { error: 'AI Vision is not available right now.', offline: true }
  }

  // Try to parse structured JSON
  try {
    const jsonMatch = reply.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && typeof parsed === 'object') {
        return { ...parsed, ai_generated: true }
      }
    }
  } catch { /* fallback to raw */ }

  return { reply, ai_generated: true }
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
