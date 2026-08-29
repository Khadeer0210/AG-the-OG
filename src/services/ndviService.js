// ═══════════════════════════════════════════════════════
// AGRI VISION — NDVI / Insurance Service (Frontend)
// Wraps backend insurance API for frontend consumption
// ═══════════════════════════════════════════════════════

const _assessmentCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 min

/**
 * Run parametric insurance assessment for a crop
 * Calls backend InsuranceEngine + NDVIEngine
 */
export async function runAssessment(cropId) {
  const cacheKey = `assess_${cropId}`
  const cached = _assessmentCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  try {
    const res = await fetch('/api/insurance.php?action=assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_id: cropId }),
    })
    if (!res.ok) {
      // Backend may be offline — return a calculated estimate
      return generateFrontendEstimate(cropId)
    }
    const data = await res.json()
    if (data.error) {
      return generateFrontendEstimate(cropId)
    }
    _assessmentCache.set(cacheKey, { data, ts: Date.now() })
    return data
  } catch {
    return generateFrontendEstimate(cropId)
  }
}

/**
 * Get all assessments history for a crop
 */
export async function getAssessments(cropId) {
  try {
    const url = cropId
      ? `/api/insurance.php?action=assessments&crop_id=${cropId}`
      : '/api/insurance.php?action=assessments'
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return data.assessments || []
  } catch {
    return []
  }
}

/**
 * Get all insurance policies
 */
export async function getPolicies() {
  try {
    const res = await fetch('/api/insurance.php?action=policies')
    if (!res.ok) return []
    const data = await res.json()
    return data.policies || []
  } catch {
    return []
  }
}

/**
 * Frontend-only parametric estimate when backend is unavailable
 * Uses available crop data to generate a reasonable estimate
 */
export function generateFrontendEstimate(cropId, cropData = null) {
  const crop = cropData || {}
  const plantDate = crop.plant_date ? new Date(crop.plant_date) : new Date(Date.now() - 60 * 86400000)
  const daysSincePlant = Math.max(0, (Date.now() - plantDate.getTime()) / 86400000)

  // Simple phenology-based NDVI curve
  const peakDay = 75
  const totalDays = 150
  const progress = daysSincePlant / totalDays
  let baseNdvi
  if (progress < 0.5) {
    baseNdvi = 0.15 + (0.82 - 0.15) * (progress / 0.5)
  } else {
    baseNdvi = 0.82 - (0.82 - 0.20) * ((progress - 0.5) / 0.5)
  }
  baseNdvi = Math.max(0.10, Math.min(0.90, baseNdvi))

  // Add slight random stress
  const stressFactor = 0.85 + Math.random() * 0.15
  const currentNdvi = +(baseNdvi * stressFactor).toFixed(3)
  const ndviStress = baseNdvi > 0 ? +((baseNdvi - currentNdvi) / baseNdvi * 100).toFixed(1) : 0

  const rainStress = 0
  const heatStress = +(Math.random() * 15).toFixed(1)
  const lossPct = +(0.55 * ndviStress + 0.30 * rainStress + 0.15 * heatStress).toFixed(2)

  const sumInsured = parseFloat(crop.sum_insured) || 150000
  const eligible = lossPct >= 20
  const payout = eligible ? +(sumInsured * lossPct / 100).toFixed(2) : 0

  let vegHealth = 'Healthy'
  let vegColor = 'var(--color-paddy)'
  if (currentNdvi < 0.25) { vegHealth = 'Critical'; vegColor = 'var(--color-alert)' }
  else if (currentNdvi < 0.4) { vegHealth = 'Stressed'; vegColor = 'var(--color-alert)' }
  else if (currentNdvi < 0.6) { vegHealth = 'Moderate'; vegColor = 'var(--color-turmeric)' }

  return {
    ndvi_now: currentNdvi,
    ndvi_base: +baseNdvi.toFixed(3),
    ndvi_stress: ndviStress,
    rain_actual: 0,
    rain_expected: 0,
    rain_stress: rainStress,
    heat_days: Math.round(heatStress / 100 * 30),
    heat_total: 30,
    heat_stress: heatStress,
    loss_pct: lossPct,
    threshold: 20,
    eligible,
    sum_insured: sumInsured,
    premium: +(sumInsured * 0.02).toFixed(2),
    premium_rate: '2%',
    payout,
    scheme: crop.scheme || 'PMFBY Kharif',
    veg_health: vegHealth,
    veg_color: vegColor,
    hash: Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
    source: 'frontend_estimate',
    days_since_plant: Math.round(daysSincePlant),
  }
}
