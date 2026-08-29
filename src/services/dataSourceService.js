// ═══════════════════════════════════════════════════════
// AGRI VISION — Data Source Service (Fallback Engine)
// Central mechanism for API → AI fallback with source tracking
// ═══════════════════════════════════════════════════════

export const DATA_SOURCES = {
  REAL_API: 'real_api',
  DATABASE: 'database',
  CALCULATED: 'calculated',
  AI_ESTIMATE: 'ai_estimate',
  FALLBACK: 'fallback',
  SIMULATED: 'simulated',
}

/**
 * Fetch data with a timed fallback to Ollama AI estimation.
 * @param {Function} primaryFn - Async function returning primary data
 * @param {Function} fallbackFn - Async function returning AI-estimated data
 * @param {number} timeoutMs - Timeout before triggering fallback (default 10s)
 * @returns {{ data: any, source: string, error?: string }}
 */
export async function fetchWithFallback(primaryFn, fallbackFn, timeoutMs = 10000) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const data = await primaryFn(controller.signal)
      clearTimeout(timer)
      if (data && !data.error) {
        return { data, source: DATA_SOURCES.REAL_API }
      }
      throw new Error(data?.error || 'Primary source returned error')
    } catch (primaryErr) {
      clearTimeout(timer)
      console.warn('[DataSource] Primary failed, trying fallback:', primaryErr.message)

      if (fallbackFn) {
        try {
          const fallbackData = await fallbackFn()
          if (fallbackData) {
            return { data: fallbackData, source: DATA_SOURCES.AI_ESTIMATE }
          }
        } catch (fallbackErr) {
          console.warn('[DataSource] Fallback also failed:', fallbackErr.message)
        }
      }

      return { data: null, source: DATA_SOURCES.FALLBACK, error: primaryErr.message }
    }
  } catch (err) {
    return { data: null, source: DATA_SOURCES.FALLBACK, error: err.message }
  }
}

/**
 * Source badge label for UI display
 */
export function getSourceLabel(source) {
  switch (source) {
    case DATA_SOURCES.REAL_API: return { label: 'Live', color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)' }
    case DATA_SOURCES.DATABASE: return { label: 'Database', color: 'var(--color-rain)', bg: 'var(--color-rain-soft)' }
    case DATA_SOURCES.CALCULATED: return { label: 'Calculated', color: 'var(--color-turmeric)', bg: 'var(--color-turmeric-soft)' }
    case DATA_SOURCES.AI_ESTIMATE: return { label: 'AI Estimated', color: '#7C3AED', bg: '#EDE9FE' }
    case DATA_SOURCES.SIMULATED: return { label: 'Simulated', color: 'var(--color-muted)', bg: 'var(--color-canvas)' }
    default: return { label: 'Unknown', color: 'var(--color-muted)', bg: 'var(--color-canvas)' }
  }
}

/**
 * Source Badge React component (inline)
 */
export function SourceBadge({ source, className = '' }) {
  const { label, color, bg } = getSourceLabel(source)
  return `<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${className}" style="background:${bg};color:${color}">${label}</span>`
}
