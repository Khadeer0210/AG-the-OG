import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Loader2, Leaf, AlertTriangle, Shield, Sparkles, X, CheckCircle, History, Trash2, Image, Cpu, RefreshCw } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'
import { AIStatusBanner } from '../components/AIStatusIndicator'
import SourceBadge from '../components/SourceBadge'

const MAX_HISTORY = 10

export default function PlantHealth() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { getAIContext, location } = useAppContext()
  const { isAIReady, isAIUnavailable } = useAIStatus()
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loadingStep, setLoadingStep] = useState('')
  const [scanHistory, setScanHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('agri_scan_history') || '[]')
    } catch { return [] }
  })
  const [showHistory, setShowHistory] = useState(false)
  const fileRef = useRef(null)

  // Save history when it changes
  useEffect(() => {
    try {
      localStorage.setItem('agri_scan_history', JSON.stringify(scanHistory.slice(0, MAX_HISTORY)))
    } catch { /* storage full */ }
  }, [scanHistory])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, etc.)')
      return
    }
    // Compress if too large (> 5MB)
    if (file.size > 5 * 1024 * 1024) {
      compressImage(file).then(compressed => {
        setImage(compressed)
        setPreview(URL.createObjectURL(compressed))
      })
    } else {
      setImage(file)
      setPreview(URL.createObjectURL(file))
    }
    setResult(null)
    setError(null)
  }

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new window.Image()
      img.onload = () => {
        const maxDim = 1024
        let w = img.width, h = img.height
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h)
          w *= ratio; h *= ratio
        }
        canvas.width = w; canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.8)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const analyze = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    setResult(null)
    setLoadingStep('Reading image...')

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1]
        setLoadingStep('Connecting to Ollama LLaVA vision model...')

        try {
          const ctx = getAIContext()
          const { analyzePlant: ollamaVision, checkHealth } = await import('../services/ollamaService')

          // Force refresh health to ensure we detect LLaVA
          setLoadingStep('Detecting available AI models...')
          const health = await checkHealth(true)
          console.log('[PlantHealth] AI Health:', health)

          setLoadingStep(`Analyzing with ${health.vision_model || health.model || 'AI'}... (this may take 30-60 seconds)`)

          const data = await ollamaVision(
            base64,
            `Analyze this plant image. Consider: ${ctx.weather || 'unknown conditions'}. Location: ${ctx.location || location?.display || 'India'}.`,
            i18n.language,
            ctx
          )

          if (data.offline || (data.error && !data.crop && !data.reply)) {
            // Ollama failed — use fallback
            setLoadingStep('LLaVA unavailable, loading fallback diagnostics...')
            const { getRandomFallbackDiagnostic } = await import('../data/plantHealthFallback')
            const fallback = getRandomFallbackDiagnostic()
            setResult({ ...fallback, is_fallback: true })
            setError(data.error || 'Vision model unavailable — showing sample diagnostic')
          } else {
            setResult(data)
            // Save to scan history
            const historyEntry = {
              id: Date.now(),
              timestamp: new Date().toISOString(),
              crop: data.crop || 'Unknown',
              disease: data.disease || 'Unknown',
              severity: data.severity || 'Unknown',
              confidence: data.confidence || null,
              model: data.model || 'LLaVA',
              is_fallback: !!data.is_fallback,
            }
            setScanHistory(prev => [historyEntry, ...prev].slice(0, MAX_HISTORY))
          }
        } catch (err) {
          console.error('[PlantHealth] Analysis error:', err)
          const { getRandomFallbackDiagnostic } = await import('../data/plantHealthFallback')
          const fallback = getRandomFallbackDiagnostic()
          setResult({ ...fallback, is_fallback: true })
          setError('Vision model connection failed — showing sample diagnostic')
        }
        setLoading(false)
        setLoadingStep('')
      }
      reader.readAsDataURL(image)
    } catch (err) {
      setLoading(false)
      setLoadingStep('')
      setError('Failed to read image file')
    }
  }

  const askChatAbout = () => {
    if (result) {
      const query = `I analyzed a plant image. Diagnosis: ${result.disease || 'Unknown'}, Crop: ${result.crop || 'Unknown'}, Severity: ${result.severity || 'Unknown'}. Summary: ${result.summary || ''}. Can you give me more detailed advice on treatment and prevention?`
      navigate(`/chat?q=${encodeURIComponent(query)}`)
    }
  }

  const reset = () => { setImage(null); setPreview(null); setResult(null); setError(null); setLoadingStep('') }

  const severityConfig = {
    Low: { color: 'var(--color-paddy)', bg: 'var(--color-paddy-soft)', icon: '🟢' },
    Moderate: { color: 'var(--color-turmeric)', bg: 'var(--color-turmeric-soft)', icon: '🟡' },
    High: { color: 'var(--color-laterite)', bg: 'rgba(205, 92, 92, 0.1)', icon: '🟠' },
    Severe: { color: 'var(--color-alert)', bg: 'var(--color-alert-soft)', icon: '🔴' },
  }

  const getSeverity = (s) => severityConfig[s] || severityConfig['Moderate']

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <div className="eyebrow-label">
          <Leaf size={13} /> LLaVA Vision Diagnostic Hub
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            {t('health.title')} <span className="text-gold-italic">Analyzer</span> 🔬
          </h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn btn-outline text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <History size={14} /> {scanHistory.length} Scans
          </button>
        </div>
      </div>

      {/* AI Status Banner */}
      <AIStatusBanner />

      {/* Scan History Panel */}
      {showHistory && scanHistory.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold m-0 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              <History size={16} style={{ color: 'var(--color-paddy)' }} /> Recent Scan History
            </h3>
            <button
              onClick={() => { setScanHistory([]); setShowHistory(false) }}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded"
              style={{ background: 'var(--color-alert-soft)', color: 'var(--color-alert)', border: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {scanHistory.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-xl text-xs"
                style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
                <div className="flex items-center gap-2">
                  <span>{getSeverity(entry.severity).icon}</span>
                  <div>
                    <span className="font-semibold">{entry.crop}</span>
                    <span style={{ color: 'var(--color-muted)' }}> — {entry.disease}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.confidence && <span className="font-bold" style={{ color: 'var(--color-rain)' }}>{entry.confidence}%</span>}
                  <span style={{ color: 'var(--color-muted)' }}>{new Date(entry.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!preview ? (
        <div className="card p-8 text-center">
          <div className="w-24 h-24 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-paddy-soft), var(--color-rain-soft))' }}>
            <Camera size={40} style={{ color: 'var(--color-paddy)', opacity: 0.7 }} />
          </div>
          <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>{t('health.scan')}</h3>
          <p className="text-sm mb-2" style={{ color: 'var(--color-muted)' }}>
            {t('health.scan_desc')}
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--color-muted)' }}>
            Powered by <strong>LLaVA</strong> vision model via local Ollama
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> {t('health.gallery')}
            </button>
            <button className="btn btn-paddy" onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
              input.onchange = (e) => handleFile(e)
              input.click()
            }}>
              <Camera size={16} /> {t('health.camera')}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} style={{ display: 'none' }} />

          {/* Supported formats note */}
          <div className="mt-6 p-3 rounded-xl text-xs" style={{ background: 'var(--color-canvas)', color: 'var(--color-muted)' }}>
            <strong>Supported:</strong> JPG, PNG, WebP · Max 5MB (auto-compressed) · Best results with close-up leaf photos
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="card overflow-hidden relative">
            <img src={preview} alt="Plant" className="w-full max-h-[350px] object-cover" />
            <button onClick={reset} className="absolute top-3 right-3 p-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            {/* Image info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
              <div className="flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-1"><Image size={12} /> {image?.name || 'Plant Image'}</span>
                <span>{(image?.size / 1024).toFixed(0)} KB</span>
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          {!result && !loading && (
            <button className="btn btn-primary w-full py-3.5 text-base" onClick={analyze}>
              <Sparkles size={18} /> Analyze with LLaVA Vision AI
            </button>
          )}

          {/* Error banner */}
          {error && (
            <div className="alert-banner severity-amber">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold m-0">{result?.is_fallback ? 'Fallback Diagnostic' : t('common.error')}</p>
                <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="card p-8 text-center space-y-4">
              <div className="relative">
                <Loader2 size={40} className="animate-spin mx-auto" style={{ color: 'var(--color-turmeric)' }} />
                <Cpu size={18} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ color: 'var(--color-turmeric)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold m-0" style={{ fontFamily: 'var(--font-display)' }}>
                  {t('health.analyzing')}
                </p>
                <p className="text-xs mt-2 m-0" style={{ color: 'var(--color-muted)' }}>
                  {loadingStep || t('health.analyzing_desc')}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--color-canvas)' }}>
                <div className="h-full rounded-full animate-pulse" style={{ background: 'var(--color-turmeric)', width: '60%' }}></div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Main Result Card */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold flex items-center gap-2 m-0" style={{ fontFamily: 'var(--font-display)' }}>
                    <Leaf size={18} style={{ color: 'var(--color-paddy)' }} /> {t('health.result')}
                  </h3>
                  <SourceBadge source={result.is_fallback ? 'ai_estimate' : 'ollama_ai'} />
                </div>

                {/* Model info */}
                {result.model && (
                  <div className="text-[10px] mb-3 px-2 py-1 rounded-lg inline-flex items-center gap-1"
                    style={{ background: 'var(--color-canvas)', color: 'var(--color-muted)' }}>
                    <Cpu size={10} /> Analyzed by: {result.model}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--color-canvas)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.crop')}</div>
                    <div className="text-sm font-semibold">{result.crop || '—'}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{
                    background: result.disease === 'None' || result.disease === 'Healthy' ? 'var(--color-paddy-soft)' : 'var(--color-alert-soft)'
                  }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.disease')}</div>
                    <div className="text-sm font-semibold" style={{
                      color: result.disease === 'None' || result.disease === 'Healthy' ? 'var(--color-paddy)' : 'var(--color-alert)'
                    }}>
                      {result.disease === 'None' ? '✅ Healthy' : result.disease || '—'}
                    </div>
                  </div>
                  {result.confidence && (
                    <div className="p-3 rounded-xl" style={{ background: 'var(--color-rain-soft)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.confidence')}</div>
                      <div className="text-sm font-bold" style={{ color: 'var(--color-rain)' }}>{result.confidence}%</div>
                    </div>
                  )}
                  {result.severity && (
                    <div className="p-3 rounded-xl" style={{ background: getSeverity(result.severity).bg }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.severity')}</div>
                      <div className="text-sm font-semibold flex items-center gap-1" style={{ color: getSeverity(result.severity).color }}>
                        {getSeverity(result.severity).icon} {result.severity}
                      </div>
                    </div>
                  )}
                </div>
                {result.summary && (
                  <p className="text-sm leading-relaxed m-0 p-3 rounded-xl" style={{ background: 'var(--color-canvas)' }}>
                    {result.summary}
                  </p>
                )}
              </div>

              {/* Treatments */}
              {(result.organic_treatment || result.chemical_treatment) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.organic_treatment && (
                    <div className="card p-4" style={{ borderLeft: '4px solid var(--color-paddy)' }}>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-paddy)' }}>
                        <Leaf size={14} /> {t('health.organic')}
                      </h4>
                      <p className="text-sm leading-relaxed m-0">{result.organic_treatment}</p>
                    </div>
                  )}
                  {result.chemical_treatment && (
                    <div className="card p-4" style={{ borderLeft: '4px solid var(--color-rain)' }}>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-rain)' }}>
                        <Shield size={14} /> {t('health.chemical')}
                      </h4>
                      <p className="text-sm leading-relaxed m-0">{result.chemical_treatment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* If it was just a reply string (LLaVA returned unstructured text) */}
              {result.reply && !result.crop && (
                <div className="card p-4">
                  <div className="text-xs mb-2 font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                    AI Analysis (Raw Response)
                  </div>
                  <p className="text-sm leading-relaxed m-0 whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: result.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button className="btn btn-outline flex-1" onClick={reset}>
                  <RefreshCw size={14} /> {t('health.scan_another')}
                </button>
                <button className="btn btn-primary flex-1" onClick={askChatAbout}>
                  <Sparkles size={14} /> {t('health.ask_chat')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
