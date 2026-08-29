import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Search, Store, Sparkles } from 'lucide-react'
import { useField } from '../context/FieldProvider'
import { useAIStatus } from '../context/AIStatusContext'
import { chat as ollamaChat } from '../services/ollamaService'
import SourceBadge from '../components/SourceBadge'

export default function MarketPrices() {
  const { t, i18n } = useTranslation()
  const { allCrops } = useField()
  const { isAIUnavailable } = useAIStatus()
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('real_api')
  const [aiEstimate, setAiEstimate] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedCrop, setSelectedCrop] = useState(null)

  const activeCropNames = useMemo(() => [...new Set(allCrops.map(c => c.crop))], [allCrops])

  useEffect(() => { loadPrices() }, [])

  async function loadPrices() {
    setLoading(true)
    try {
      const res = await fetch('/api/market.php?action=prices')
      if (res.ok) {
        const data = await res.json()
        setPrices(data.prices || [])
        setSource(data.prices?.length ? 'real_api' : 'fallback')
      } else throw new Error('fail')
    } catch {
      setSource('fallback')
    } finally { setLoading(false) }
  }

  async function getDetailedEstimate(cropName) {
    setSelectedCrop(cropName); setAiLoading(true)
    try {
      const prompt = `Brief market analysis for ${cropName} in Tamil Nadu: current price trend, key factors, 2-week outlook. Under 80 words.`
      const data = await ollamaChat(prompt, [], i18n.language, {})
      setAiEstimate(data.reply || 'Unable to generate.')
    } catch { setAiEstimate('AI unavailable.') }
    setAiLoading(false)
  }

  const filtered = prices.filter(p => p.crop?.toLowerCase().includes(search.toLowerCase()) || p.market?.toLowerCase().includes(search.toLowerCase()))

  const getTrend = (price, prev) => {
    if (!prev) return { icon: Minus, color: 'var(--color-muted)', label: 'Stable' }
    const d = price - prev
    if (d > 0) return { icon: TrendingUp, color: 'var(--color-paddy)', label: `+₹${d.toFixed(0)}` }
    if (d < 0) return { icon: TrendingDown, color: 'var(--color-alert)', label: `₹${d.toFixed(0)}` }
    return { icon: Minus, color: 'var(--color-muted)', label: 'Stable' }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>Market Prices 📊</h1>
          <p className="text-sm m-0" style={{ color: 'var(--color-muted)' }}>Live commodity prices for Tamil Nadu markets</p>
        </div>
        <div className="flex items-center gap-2">
          <SourceBadge source={source} />
          <button onClick={loadPrices} className="btn btn-outline text-xs py-2 px-3" disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {activeCropNames.length > 0 && (
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, var(--color-paddy-soft) 0%, var(--color-card) 100%)' }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-paddy)' }}>📍 Your Crop Prices</div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {activeCropNames.map((name, i) => {
              const cp = prices.find(p => p.crop?.toLowerCase().includes(name.toLowerCase()))
              return (
                <div key={i} className="card p-3 min-w-[140px] shrink-0 text-center">
                  <div className="text-xs font-semibold mb-1">{name}</div>
                  <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-paddy)' }}>
                    {cp ? `₹${Number(cp.price).toLocaleString()}` : '—'}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{cp?.market || 'per quintal'}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search crop or market..." className="input pl-11 py-3" />
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--color-paddy)' }} />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Fetching latest market prices...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.slice(0, 20).map((p, i) => {
              const same = prices.filter(x => x.crop === p.crop)
              const prev = same.length > 1 ? parseFloat(same[1]?.price) : null
              const trend = getTrend(parseFloat(p.price), prev)
              const TI = trend.icon
              const isUser = activeCropNames.some(n => p.crop?.toLowerCase().includes(n.toLowerCase()))
              return (
                <div key={p.id || i} className="card p-4 flex items-center justify-between hover:shadow-md transition-all" style={{ borderLeft: isUser ? '4px solid var(--color-paddy)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isUser ? 'var(--color-paddy-soft)' : 'var(--color-canvas)' }}>
                      <Store size={18} style={{ color: isUser ? 'var(--color-paddy)' : 'var(--color-muted)' }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{p.crop}</div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.market} · {p.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>₹{Number(p.price).toLocaleString()}</div>
                    <div className="flex items-center gap-1 justify-end text-[11px] font-semibold" style={{ color: trend.color }}><TI size={12} /> {trend.label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="card p-8 text-center">
              <Store size={40} className="mx-auto mb-3" style={{ color: 'var(--color-muted)', opacity: 0.3 }} />
              <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>No Prices Available</h3>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Market data unavailable or loading.</p>
            </div>
          )}

          <div className="card p-5 space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Sparkles size={16} style={{ color: 'var(--color-turmeric)' }} /> AI Market Analysis
            </h3>
            <div className="flex flex-wrap gap-2">
              {(activeCropNames.length > 0 ? activeCropNames : ['Paddy', 'Groundnut', 'Tomato']).map((crop, i) => (
                <button key={i} onClick={() => getDetailedEstimate(crop)} disabled={aiLoading || isAIUnavailable}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: selectedCrop === crop ? 'var(--color-turmeric-soft)' : 'var(--color-canvas)', border: '1px solid var(--color-card-border)', cursor: 'pointer', color: selectedCrop === crop ? 'var(--color-turmeric)' : 'var(--color-ink)' }}>
                  {crop}
                </button>
              ))}
            </div>
            {aiLoading && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-turmeric)' }}><Loader2 size={14} className="animate-spin" /> Generating...</div>}
            {aiEstimate && !aiLoading && (
              <div className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-line" style={{ background: 'var(--color-turmeric-soft)' }}>
                <div className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'var(--color-turmeric)' }}><Sparkles size={12} /> {selectedCrop}</div>
                {aiEstimate}
              </div>
            )}
            {!aiEstimate && !aiLoading && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Select a crop for AI market analysis.</p>}
          </div>
        </>
      )}
    </div>
  )
}
