// ═══════════════════════════════════════════════════════
// AGRI VISION — Weather Service (Direct Open-Meteo)
// Field-aware weather with historical + forecast data
// ═══════════════════════════════════════════════════════

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const _cache = new Map()

function cacheKey(lat, lng, type) {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${type}`
}

function getCached(key) {
  const entry = _cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  return null
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() })
}

// Weather code descriptions
const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
  55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall',
  80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
}

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌧️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

import { fetchWithFallback } from './dataSourceService'
import { generateBulletin } from './ollamaService'

/**
 * Fetch field weather with 10s timeout fallback to Ollama AI estimation
 */
export async function fetchFieldWeatherWithFallback(lat, lng, crop = '') {
  return fetchWithFallback(
    async () => {
      const data = await fetchFieldWeather(lat, lng)
      if (!data || data.error) throw new Error(data?.error || 'Weather fetch failed')
      return data
    },
    async () => {
      // Fallback: AI Weather Estimate
      const bulletin = await generateBulletin({ lat, lng }, crop, 'en')
      return {
        is_ai_estimate: true,
        current: {
          temp: 28,
          humidity: 70,
          feels_like: 30,
          precipitation: 0,
          rain: 0,
          weather_code: 2,
          weather_desc: 'AI Estimated Weather',
          weather_icon: '🌤️',
          wind_speed: 12,
          wind_dir: 180,
        },
        bulletin: bulletin?.bulletin || 'AI Weather Estimate active.',
        analytics: {
          avg_temp_7d: 28,
          total_rain_7d: 15,
          total_rain_30d: 60,
          dry_spell: 2,
          heat_stress_days: 0,
          forecast_rain_total: 10,
        },
        daily: [],
        forecast: [],
        historical: [],
        risks: [],
      }
    },
    10000
  )
}

/**
 * Fetch comprehensive weather data for a field location
 * Uses the exact Open-Meteo URL pattern from user requirements
 * Includes: past 61 days + 7 day forecast + soil data
 */
export async function fetchFieldWeather(lat, lng) {
  const key = cacheKey(lat, lng, 'full')
  const cached = getCached(key)
  if (cached) return cached

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=sunrise,sunset,daylight_duration,weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max` +
      `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,rain,apparent_temperature,precipitation_probability,precipitation,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_moisture_1_to_3cm,soil_moisture_9_to_27cm` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m` +
      `&timezone=auto&past_days=61&forecast_days=7`

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    const result = processWeatherData(data)
    setCache(key, result)
    return result
  } catch (err) {
    console.warn('[Weather] Open-Meteo Fetch failed, attempting Ollama AI Weather:', err.message)
    const ollamaWeather = await fetchWeatherFromOllama(lat, lng, 'Selected Location')
    if (ollamaWeather) return ollamaWeather
    return generateFallbackWeatherData(lat, lng)
  }
}

/**
 * Fetch and build complete weather object using Ollama AI
 */
export async function fetchWeatherFromOllama(lat = 12.9699, lng = 79.9405, locationName = 'Selected Location') {
  try {
    const { fetchOllamaWeather } = await import('./ollamaService')
    const res = await fetchOllamaWeather(locationName, lat, lng)
    if (!res || !res.success) return null

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const forecast = (res.forecast || []).map((f, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      return {
        date: d.toISOString().split('T')[0],
        temp_max: f.temp_max || 32,
        temp_min: f.temp_min || 23,
        precipitation: f.rain_mm || 0,
        rain: f.rain_mm || 0,
        weather_desc: f.condition || 'Partly Cloudy',
        weather_icon: (f.condition || '').toLowerCase().includes('rain') ? '🌧️' : '⛅',
        precip_probability: (f.rain_mm || 0) > 0 ? 70 : 15,
        wind_max: 12,
      }
    })

    // Construct 24 hourly values
    const hourly = []
    for (let h = 0; h < 24; h++) {
      const t = new Date(now)
      t.setHours(h, 0, 0, 0)
      hourly.push({
        time: t.toISOString(),
        temp: Math.round((res.temp || 30) - 4 + Math.sin((h - 6) / 4) * 6),
        humidity: Math.round((res.humidity || 70) + Math.cos((h - 6) / 4) * 10),
        rain: h === 14 ? (res.precipitation || 0) : 0,
        precip_probability: h === 14 ? 50 : 10,
      })
    }

    // Construct soil array
    const soilData = []
    for (let i = -14; i <= 0; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      soilData.push({
        date: d.toISOString().split('T')[0],
        soil_temp_0cm: (res.soil_temp_c || 28) + (Math.random() * 2 - 1),
        soil_temp_6cm: (res.soil_temp_c || 28) - 1,
        soil_temp_18cm: (res.soil_temp_c || 28) - 2,
        soil_moisture_1_3cm: (res.soil_moisture_pct ? res.soil_moisture_pct / 100 : 0.24),
        soil_moisture_9_27cm: (res.soil_moisture_pct ? res.soil_moisture_pct / 100 + 0.05 : 0.30),
      })
    }

    return {
      is_ai_estimate: true,
      is_ollama: true,
      current: {
        temp: res.temp || 31,
        humidity: res.humidity || 72,
        feels_like: res.feels_like || 34,
        precipitation: res.precipitation || 0,
        rain: res.precipitation || 0,
        weather_code: 2,
        weather_desc: res.weather_desc || 'Generated via Ollama AI',
        weather_icon: res.weather_icon || '⛅',
        wind_speed: res.wind_speed || 12,
        wind_dir: 160,
        time: now.toISOString(),
      },
      daily: forecast,
      historical: [],
      forecast,
      hourly,
      soilData,
      bulletin: res.bulletin || '',
      analytics: {
        avg_temp_7d: res.temp || 30,
        total_rain_7d: forecast.reduce((acc, f) => acc + f.precipitation, 0),
        total_rain_30d: 65,
        max_temp_7d: Math.max(...forecast.map(f => f.temp_max)),
        min_temp_7d: Math.min(...forecast.map(f => f.temp_min)),
        rainy_days_30d: forecast.filter(f => f.precipitation > 0).length,
        dry_spell: 3,
        heat_stress_days: forecast.filter(f => f.temp_max > 35).length,
        forecast_rain_total: forecast.reduce((acc, f) => acc + f.precipitation, 0),
        forecast_rain_probability: 50,
      },
      risks: [
        { type: 'ollama_ai', severity: 'low', desc: 'Forecast synthesized by local Ollama AI model' }
      ],
      location: { lat, lng },
      fetched_at: now.toISOString(),
    }
  } catch (e) {
    console.warn('[Ollama Weather Service] Error:', e.message)
    return null
  }
}

/**
 * Generate full synthetic weather payload for a location when API is offline
 */
export function generateFallbackWeatherData(lat = 12.9699, lng = 79.9405) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // Synthesize 61 past days + 7 forecast days
  const daily = []
  const historical = []
  const forecast = []
  const soilData = []
  const hourly = []

  for (let i = -61; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const tempMax = Math.round(30 + Math.sin(i / 5) * 4 + (Math.random() * 2 - 1))
    const tempMin = Math.round(22 + Math.cos(i / 5) * 3 + (Math.random() * 2 - 1))
    const rain = i % 4 === 0 ? Math.round((Math.random() * 15) * 10) / 10 : 0
    const entry = {
      date: dateStr,
      weather_code: rain > 5 ? 61 : tempMax > 33 ? 0 : 2,
      weather_desc: rain > 5 ? 'Slight Rain' : tempMax > 33 ? 'Clear sky' : 'Partly cloudy',
      weather_icon: rain > 5 ? '🌧️' : tempMax > 33 ? '☀️' : '⛅',
      temp_max: tempMax,
      temp_min: tempMin,
      precipitation: rain,
      rain: rain,
      precip_probability: rain > 0 ? 70 : 15,
      wind_max: 14,
    }

    daily.push(entry)
    if (i < 0) historical.push(entry)
    else forecast.push(entry)

    soilData.push({
      date: dateStr,
      soil_temp_0cm: tempMin + 4,
      soil_temp_6cm: tempMin + 2,
      soil_temp_18cm: tempMin + 1,
      soil_moisture_1_3cm: 0.22 + (rain > 0 ? 0.08 : -0.02),
      soil_moisture_9_27cm: 0.30 + (rain > 0 ? 0.04 : -0.01),
    })
  }

  // Generate 24 hourly points
  for (let h = 0; h < 24; h++) {
    const t = new Date(now)
    t.setHours(h, 0, 0, 0)
    hourly.push({
      time: t.toISOString(),
      temp: Math.round(24 + Math.sin((h - 6) / 4) * 6),
      humidity: Math.round(75 - Math.sin((h - 6) / 4) * 20),
      rain: h === 14 ? 1.2 : 0,
      precip_probability: h === 14 ? 60 : 10,
    })
  }

  return {
    is_ai_estimate: true,
    current: {
      temp: 31,
      humidity: 72,
      feels_like: 34,
      precipitation: 0,
      rain: 0,
      weather_code: 2,
      weather_desc: 'Partly Cloudy (Location AI Estimate)',
      weather_icon: '⛅',
      wind_speed: 12,
      wind_dir: 160,
      time: now.toISOString(),
    },
    daily,
    historical,
    forecast,
    hourly,
    soilData,
    analytics: {
      avg_temp_7d: 28.5,
      total_rain_7d: 14.2,
      total_rain_30d: 78.0,
      max_temp_7d: 34,
      min_temp_7d: 22,
      rainy_days_30d: 8,
      dry_spell: 4,
      heat_stress_days: 1,
      forecast_rain_total: 10.5,
      forecast_rain_probability: 60,
    },
    risks: [
      { type: 'heat_stress', severity: 'moderate', desc: 'Daytime temperatures peak around 34°C; monitor soil moisture' },
      { type: 'irrigation_need', severity: 'low', desc: 'Soil moisture is optimal; no urgent irrigation needed' }
    ],
    location: { lat, lng, timezone: 'Asia/Kolkata' },
    fetched_at: now.toISOString(),
  }
}

/**
 * Process raw Open-Meteo response into structured format
 */
function processWeatherData(raw) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // ── Current conditions ──
  const current = raw.current ? {
    temp: raw.current.temperature_2m,
    humidity: raw.current.relative_humidity_2m,
    feels_like: raw.current.apparent_temperature,
    precipitation: raw.current.precipitation,
    rain: raw.current.rain,
    weather_code: raw.current.weather_code,
    weather_desc: WMO_CODES[raw.current.weather_code] || 'Unknown',
    weather_icon: WMO_ICONS[raw.current.weather_code] || '🌡️',
    wind_speed: raw.current.wind_speed_10m,
    wind_dir: raw.current.wind_direction_10m,
    time: raw.current.time,
  } : null

  // ── Daily data — split into historical + forecast ──
  const daily = []
  const historical = []
  const forecast = []

  if (raw.daily?.time) {
    raw.daily.time.forEach((date, i) => {
      const entry = {
        date,
        weather_code: raw.daily.weather_code?.[i],
        weather_desc: WMO_CODES[raw.daily.weather_code?.[i]] || '',
        weather_icon: WMO_ICONS[raw.daily.weather_code?.[i]] || '🌡️',
        temp_max: raw.daily.temperature_2m_max?.[i],
        temp_min: raw.daily.temperature_2m_min?.[i],
        precipitation: raw.daily.precipitation_sum?.[i],
        rain: raw.daily.rain_sum?.[i],
        precip_probability: raw.daily.precipitation_probability_max?.[i],
        wind_max: raw.daily.wind_speed_10m_max?.[i],
        sunrise: raw.daily.sunrise?.[i],
        sunset: raw.daily.sunset?.[i],
        daylight: raw.daily.daylight_duration?.[i],
      }
      daily.push(entry)
      if (date < todayStr) historical.push(entry)
      else forecast.push(entry)
    })
  }

  // ── Hourly data (next 48 hours for forecast display) ──
  const hourly = []
  const soilData = []
  if (raw.hourly?.time) {
    const nowTs = now.getTime()
    raw.hourly.time.forEach((time, i) => {
      const ts = new Date(time).getTime()
      // Hourly forecast: next 48 hours
      if (ts >= nowTs - 3600000 && ts <= nowTs + 48 * 3600000) {
        hourly.push({
          time,
          temp: raw.hourly.temperature_2m?.[i],
          humidity: raw.hourly.relative_humidity_2m?.[i],
          dew_point: raw.hourly.dew_point_2m?.[i],
          feels_like: raw.hourly.apparent_temperature?.[i],
          rain: raw.hourly.rain?.[i],
          precipitation: raw.hourly.precipitation?.[i],
          precip_probability: raw.hourly.precipitation_probability?.[i],
        })
      }

      // Soil data — daily snapshot at noon
      const hour = new Date(time).getHours()
      if (hour === 12) {
        soilData.push({
          date: time.split('T')[0],
          soil_temp_0cm: raw.hourly.soil_temperature_0cm?.[i],
          soil_temp_6cm: raw.hourly.soil_temperature_6cm?.[i],
          soil_temp_18cm: raw.hourly.soil_temperature_18cm?.[i],
          soil_moisture_1_3cm: raw.hourly.soil_moisture_1_to_3cm?.[i],
          soil_moisture_9_27cm: raw.hourly.soil_moisture_9_to_27cm?.[i],
        })
      }
    })
  }

  // ── Computed analytics ──
  const last7 = historical.slice(-7)
  const last30 = historical.slice(-30)

  const analytics = {
    avg_temp_7d: last7.length ? +(last7.reduce((s, d) => s + (d.temp_max + d.temp_min) / 2, 0) / last7.length).toFixed(1) : null,
    total_rain_7d: last7.reduce((s, d) => s + (d.rain || 0), 0),
    total_rain_30d: last30.reduce((s, d) => s + (d.rain || 0), 0),
    max_temp_7d: last7.length ? Math.max(...last7.map(d => d.temp_max)) : null,
    min_temp_7d: last7.length ? Math.min(...last7.map(d => d.temp_min)) : null,
    rainy_days_30d: last30.filter(d => (d.rain || 0) > 1).length,
    dry_spell: calculateDrySpell(last30),
    heat_stress_days: last7.filter(d => d.temp_max > 38).length,
    forecast_rain_total: forecast.reduce((s, d) => s + (d.rain || 0), 0),
    forecast_rain_probability: forecast.length ? Math.max(...forecast.map(d => d.precip_probability || 0)) : 0,
  }

  // ── Risk assessment ──
  const risks = []
  if (analytics.heat_stress_days > 2) risks.push({ type: 'heat_stress', severity: 'high', desc: `${analytics.heat_stress_days} days above 38°C in the last week` })
  if (analytics.dry_spell > 10) risks.push({ type: 'dry_spell', severity: 'moderate', desc: `${analytics.dry_spell} consecutive days without rain` })
  if (analytics.forecast_rain_total > 50) risks.push({ type: 'heavy_rain', severity: 'high', desc: `${analytics.forecast_rain_total.toFixed(0)}mm rain expected in next 7 days` })
  if (analytics.total_rain_7d > 100) risks.push({ type: 'waterlogging', severity: 'moderate', desc: `${analytics.total_rain_7d.toFixed(0)}mm rain in the last 7 days` })

  return {
    current, daily, historical, forecast, hourly, soilData, analytics, risks,
    location: { lat: raw.latitude, lng: raw.longitude, timezone: raw.timezone },
    fetched_at: new Date().toISOString(),
  }
}

function calculateDrySpell(days) {
  let maxDry = 0, currentDry = 0
  for (const d of days) {
    if ((d.rain || 0) < 1) { currentDry++; maxDry = Math.max(maxDry, currentDry) }
    else currentDry = 0
  }
  return maxDry
}

/**
 * Get ML-ready weather features for a field
 */
export function getWeatherFeatures(weatherData) {
  if (!weatherData?.analytics) return null
  const { analytics, current, forecast, soilData } = weatherData

  const latestSoil = soilData?.length ? soilData[soilData.length - 1] : {}

  return {
    current_temp: current?.temp,
    current_humidity: current?.humidity,
    current_rain: current?.rain,
    avg_temp_7d: analytics.avg_temp_7d,
    total_rain_7d: analytics.total_rain_7d,
    total_rain_30d: analytics.total_rain_30d,
    dry_spell_days: analytics.dry_spell,
    heat_stress_days: analytics.heat_stress_days,
    rainy_days_30d: analytics.rainy_days_30d,
    forecast_rain: analytics.forecast_rain_total,
    forecast_rain_prob: analytics.forecast_rain_probability,
    soil_temp_surface: latestSoil.soil_temp_0cm,
    soil_moisture_shallow: latestSoil.soil_moisture_1_3cm,
    soil_moisture_deep: latestSoil.soil_moisture_9_27cm,
  }
}

/**
 * Simple ML prediction engine (heuristic-based)
 * Produces structured predictions from weather features
 */
export function predictFieldRisks(features, crop = '', growthStage = '') {
  if (!features) return null

  const predictions = {
    irrigation_need: 'unknown',
    irrigation_confidence: 0,
    disease_risk: 'unknown',
    disease_confidence: 0,
    heat_stress: 'unknown',
    crop_stress: 'unknown',
    reasoning: [],
  }

  // ── Irrigation prediction ──
  const soilMoist = features.soil_moisture_shallow
  const recentRain = features.total_rain_7d
  const forecastRain = features.forecast_rain

  if (forecastRain > 10) {
    predictions.irrigation_need = 'low'
    predictions.irrigation_confidence = 0.8
    predictions.reasoning.push('Rain expected — irrigation not recommended')
  } else if (recentRain > 30) {
    predictions.irrigation_need = 'low'
    predictions.irrigation_confidence = 0.7
    predictions.reasoning.push('Recent rainfall is adequate')
  } else if (soilMoist && soilMoist < 0.15) {
    predictions.irrigation_need = 'high'
    predictions.irrigation_confidence = 0.75
    predictions.reasoning.push('Soil moisture is low — irrigation recommended')
  } else if (features.dry_spell_days > 5) {
    predictions.irrigation_need = 'moderate'
    predictions.irrigation_confidence = 0.65
    predictions.reasoning.push(`Dry spell of ${features.dry_spell_days} days`)
  } else {
    predictions.irrigation_need = 'low'
    predictions.irrigation_confidence = 0.5
    predictions.reasoning.push('Conditions appear adequate')
  }

  // ── Disease risk ──
  const highHumidity = features.current_humidity > 80
  const warmTemp = features.current_temp > 22 && features.current_temp < 32
  const recentWet = recentRain > 20

  if (highHumidity && warmTemp && recentWet) {
    predictions.disease_risk = 'high'
    predictions.disease_confidence = 0.7
    predictions.reasoning.push('High humidity + warm + wet conditions increase fungal disease risk')
  } else if (highHumidity && warmTemp) {
    predictions.disease_risk = 'moderate'
    predictions.disease_confidence = 0.6
    predictions.reasoning.push('Warm humid conditions may favor disease development')
  } else {
    predictions.disease_risk = 'low'
    predictions.disease_confidence = 0.5
    predictions.reasoning.push('Weather conditions are not favorable for disease')
  }

  // ── Heat stress ──
  if (features.heat_stress_days > 3) {
    predictions.heat_stress = 'high'
    predictions.reasoning.push('Multiple days of extreme heat detected')
  } else if (features.current_temp > 35) {
    predictions.heat_stress = 'moderate'
    predictions.reasoning.push('Current temperature is elevated')
  } else {
    predictions.heat_stress = 'low'
  }

  // ── Overall crop stress ──
  const stressFactors = [
    predictions.irrigation_need === 'high' ? 1 : 0,
    predictions.disease_risk === 'high' ? 1 : predictions.disease_risk === 'moderate' ? 0.5 : 0,
    predictions.heat_stress === 'high' ? 1 : predictions.heat_stress === 'moderate' ? 0.5 : 0,
  ]
  const stressScore = stressFactors.reduce((a, b) => a + b, 0) / 3
  predictions.crop_stress = stressScore > 0.6 ? 'high' : stressScore > 0.3 ? 'moderate' : 'low'

  return predictions
}
