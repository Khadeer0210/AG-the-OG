// ═══════════════════════════════════════════════════════
// AGRI VISION — Field Knowledge Graph / Context Layer
// Retrieves ONLY relevant context for AI queries
// Reduces token consumption by selecting targeted subgraphs
// ═══════════════════════════════════════════════════════

/**
 * Build a compact, relevant context object for a specific field
 * This is the "knowledge graph" — it connects field → crop → weather → soil → predictions
 * and returns ONLY what's needed for the current AI query
 */
export function buildFieldContext(field, options = {}) {
  const {
    crops = [],
    soil = null,
    weather = null,
    predictions = null,
    marketData = [],
    timeline = [],
    insurance = [],
    intent = 'general', // general, irrigation, disease, market, report
  } = options

  const ctx = {
    field_id: `FIELD-${String(field.id).padStart(3, '0')}`,
    field_name: field.name,
    location: `${parseFloat(field.lat).toFixed(4)}°N, ${parseFloat(field.lng).toFixed(4)}°E`,
    area: `${field.area_ha} hectares`,
    soil_type: field.soil_type || 'Unknown',
  }

  // ── Crop context (always relevant) ──
  if (crops.length > 0) {
    ctx.crops = crops.map(c => ({
      crop: c.crop,
      variety: c.variety || '',
      stage: c.stage || '',
      status: c.status || '',
      planted: c.plant_date || '',
      area: c.area_ha ? `${c.area_ha} ha` : '',
    }))
    // Quick summary string
    ctx.crop_summary = crops.map(c =>
      `${c.crop}${c.variety ? ` (${c.variety})` : ''} — ${c.stage || 'growing'}`
    ).join(', ')
  }

  // ── Weather context (scope depends on intent) ──
  if (weather) {
    ctx.weather = {}

    // Always include current conditions
    if (weather.current) {
      ctx.weather.current = `${weather.current.temp}°C, ${weather.current.humidity}% humidity, ${weather.current.weather_desc}`
      if (weather.current.rain > 0) ctx.weather.current += `, ${weather.current.rain}mm rain`
    }

    // Analytics (compact summary)
    if (weather.analytics) {
      ctx.weather.recent = `Last 7 days: avg ${weather.analytics.avg_temp_7d}°C, ${weather.analytics.total_rain_7d.toFixed(1)}mm rain`
      if (weather.analytics.dry_spell > 3) ctx.weather.dry_spell = `${weather.analytics.dry_spell} day dry spell`
      if (weather.analytics.heat_stress_days > 0) ctx.weather.heat_stress = `${weather.analytics.heat_stress_days} heat stress days`
    }

    // Forecast (intent-relevant)
    if (intent === 'irrigation' || intent === 'general') {
      if (weather.analytics) {
        ctx.weather.forecast_rain = `${weather.analytics.forecast_rain_total.toFixed(1)}mm expected in next 7 days`
        ctx.weather.forecast_rain_prob = `${weather.analytics.forecast_rain_probability}% max rain probability`
      }
    }

    // Risks
    if (weather.risks?.length > 0) {
      ctx.weather.risks = weather.risks.map(r => `${r.type}: ${r.desc}`).join('; ')
    }

    // Soil moisture (for irrigation queries)
    if (intent === 'irrigation' && weather.soilData?.length > 0) {
      const latest = weather.soilData[weather.soilData.length - 1]
      ctx.weather.soil_moisture = `Surface: ${latest.soil_moisture_1_3cm?.toFixed(3) || 'N/A'} m³/m³, Deep: ${latest.soil_moisture_9_27cm?.toFixed(3) || 'N/A'} m³/m³`
    }
  }

  // ── Soil/Lab context ──
  if (soil && (intent === 'general' || intent === 'report' || intent === 'irrigation')) {
    ctx.soil = {
      ph: soil.ph,
      nitrogen: `${soil.n} kg/ha`,
      phosphorus: `${soil.p} kg/ha`,
      potassium: `${soil.k} kg/ha`,
      organic_carbon: `${soil.organic_c}%`,
      source: soil.source || 'lab',
    }
  }

  // ── ML Predictions ──
  if (predictions) {
    ctx.predictions = {
      irrigation_need: predictions.irrigation_need,
      disease_risk: predictions.disease_risk,
      heat_stress: predictions.heat_stress,
      crop_stress: predictions.crop_stress,
    }
    if (predictions.reasoning?.length > 0) {
      ctx.predictions.reasoning = predictions.reasoning.slice(0, 3).join('; ')
    }
  }

  // ── Market data (only for market/report intent) ──
  if (marketData.length > 0 && (intent === 'market' || intent === 'report')) {
    ctx.market = marketData.slice(0, 5).map(m => ({
      crop: m.crop,
      market: m.market,
      price: `₹${m.price}/quintal`,
      date: m.date,
    }))
  }

  // ── Insurance (for report intent) ──
  if (insurance.length > 0 && (intent === 'insurance' || intent === 'report')) {
    ctx.insurance = insurance.map(p => ({
      scheme: p.scheme,
      sum_insured: `₹${p.sum_insured}`,
      status: p.status,
    }))
  }

  // ── Recent timeline events (last 5) ──
  if (timeline.length > 0) {
    ctx.recent_events = timeline.slice(0, 5).map(e => `${e.created_at?.split('T')[0] || ''}: ${e.title}`)
  }

  return ctx
}

/**
 * Compress context to a concise string for Ollama prompt
 * This is the key token-efficiency function
 */
export function contextToPromptString(ctx) {
  const parts = []

  parts.push(`Field: ${ctx.field_name} (${ctx.field_id}), ${ctx.area}, ${ctx.location}`)
  if (ctx.soil_type) parts.push(`Soil: ${ctx.soil_type}`)
  if (ctx.crop_summary) parts.push(`Crops: ${ctx.crop_summary}`)

  if (ctx.weather) {
    if (ctx.weather.current) parts.push(`Current weather: ${ctx.weather.current}`)
    if (ctx.weather.recent) parts.push(ctx.weather.recent)
    if (ctx.weather.forecast_rain) parts.push(`Forecast: ${ctx.weather.forecast_rain}`)
    if (ctx.weather.dry_spell) parts.push(`Alert: ${ctx.weather.dry_spell}`)
    if (ctx.weather.heat_stress) parts.push(`Alert: ${ctx.weather.heat_stress}`)
    if (ctx.weather.risks) parts.push(`Risks: ${ctx.weather.risks}`)
    if (ctx.weather.soil_moisture) parts.push(`Soil moisture: ${ctx.weather.soil_moisture}`)
  }

  if (ctx.soil) {
    parts.push(`Lab results: pH=${ctx.soil.ph}, N=${ctx.soil.nitrogen}, P=${ctx.soil.phosphorus}, K=${ctx.soil.potassium}, OC=${ctx.soil.organic_carbon}`)
  }

  if (ctx.predictions) {
    parts.push(`ML predictions: Irrigation=${ctx.predictions.irrigation_need}, Disease risk=${ctx.predictions.disease_risk}, Heat stress=${ctx.predictions.heat_stress}`)
    if (ctx.predictions.reasoning) parts.push(`Reasoning: ${ctx.predictions.reasoning}`)
  }

  if (ctx.market) {
    parts.push(`Market: ${ctx.market.map(m => `${m.crop} ₹${m.price} at ${m.market}`).join(', ')}`)
  }

  if (ctx.recent_events) {
    parts.push(`Recent events: ${ctx.recent_events.join('; ')}`)
  }

  return parts.join('\n')
}

/**
 * Detect user intent from a query string
 * Used to scope which data to retrieve from the graph
 */
export function detectIntent(query) {
  const q = query.toLowerCase()

  if (/irrigat|water|paani|neer/.test(q)) return 'irrigation'
  if (/disease|pest|fungus|blight|wilt|rog|keeda/.test(q)) return 'disease'
  if (/market|price|sell|mandi|bazaar/.test(q)) return 'market'
  if (/insurance|claim|pmfby|bima/.test(q)) return 'insurance'
  if (/report|pdf|summary/.test(q)) return 'report'
  if (/soil|lab|nitrogen|phosphorus|ph/.test(q)) return 'soil'
  if (/weather|rain|temp|forecast|barish|mausam/.test(q)) return 'weather'

  return 'general'
}

/**
 * Estimate token usage of a context string
 */
export function estimateTokens(text) {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4)
}
