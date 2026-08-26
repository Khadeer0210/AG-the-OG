import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Loader2, Leaf, AlertTriangle, Shield, Sparkles, X, CheckCircle } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'
import { AIStatusBanner } from '../components/AIStatusIndicator'

export default function PlantHealth() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { getAIContext } = useAppContext()
  const { isAIReady, isAIUnavailable } = useAIStatus()
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setError(null)
  }

  const analyze = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1]
        try {
          const ctx = getAIContext()
          const { analyzePlant: ollamaVision } = await import('../services/ollamaService')
          const data = await ollamaVision(
            base64,
            `Analyze this plant image. Consider: ${ctx.weather || 'unknown conditions'}. Location: ${ctx.location || 'unknown'}.`,
            i18n.language,
            ctx
          )
          if (data.offline) {
            setError(data.error || t('common.ai_offline'))
          } else if (data.error && !data.crop) {
            setError(data.error)
          } else {
            setResult(data)
          }
        } catch {
          setError(t('common.error'))
        }
        setLoading(false)
      }
      reader.readAsDataURL(image)
    } catch {
      setLoading(false)
      setError(t('common.error'))
    }
  }

  const askChatAbout = () => {
    if (result) {
      const query = `I analyzed a plant image. Diagnosis: ${result.disease || 'Unknown'}, Crop: ${result.crop || 'Unknown'}, Severity: ${result.severity || 'Unknown'}. Can you give me more detailed advice?`
      navigate(`/chat?q=${encodeURIComponent(query)}`)
    }
  }

  const reset = () => { setImage(null); setPreview(null); setResult(null); setError(null) }

  const severityColor = { Low: 'var(--color-paddy)', Moderate: 'var(--color-turmeric)', High: 'var(--color-laterite)', Severe: 'var(--color-alert)' }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>{t('health.title')} 🔬</h1>

      {/* AI Status Banner */}
      <AIStatusBanner />

      {!preview ? (
        <div className="card p-8 text-center">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--color-paddy-soft)' }}>
            <Camera size={36} style={{ color: 'var(--color-paddy)', opacity: 0.6 }} />
          </div>
          <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>{t('health.scan')}</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
            {t('health.scan_desc')}
          </p>
          <div className="flex gap-3 justify-center">
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
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="card overflow-hidden relative">
            <img src={preview} alt="Plant" className="w-full max-h-[300px] object-cover" />
            <button onClick={reset} className="absolute top-3 right-3 p-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {!result && !loading && !error && (
            <button className="btn btn-primary w-full py-3" onClick={analyze} disabled={isAIUnavailable}>
              <Sparkles size={16} /> {isAIUnavailable ? 'AI Unavailable — Cannot Analyze' : t('health.analyze_btn')}
            </button>
          )}

          {error && (
            <div className="alert-banner severity-amber">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold m-0">{t('common.error')}</p>
                <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="card p-8 text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--color-turmeric)' }} />
              <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>{t('health.analyzing')}</p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('health.analyzing_desc')}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Leaf size={18} style={{ color: 'var(--color-paddy)' }} /> {t('health.result')}
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--color-canvas)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.crop')}</div>
                    <div className="text-sm font-semibold">{result.crop || '—'}</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: result.disease === 'None' ? 'var(--color-paddy-soft)' : 'var(--color-alert-soft)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.disease')}</div>
                    <div className="text-sm font-semibold" style={{ color: result.disease === 'None' ? 'var(--color-paddy)' : 'var(--color-alert)' }}>
                      {result.disease || '—'}
                    </div>
                  </div>
                  {result.confidence && (
                    <div className="p-3 rounded-xl" style={{ background: 'var(--color-rain-soft)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.confidence')}</div>
                      <div className="text-sm font-bold" style={{ color: 'var(--color-rain)' }}>{result.confidence}%</div>
                    </div>
                  )}
                  {result.severity && (
                    <div className="p-3 rounded-xl" style={{ background: 'var(--color-turmeric-soft)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('health.severity')}</div>
                      <div className="text-sm font-semibold" style={{ color: severityColor[result.severity] || 'var(--color-ink)' }}>{result.severity}</div>
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

              {/* If it was just a reply string */}
              {result.reply && !result.crop && (
                <div className="card p-4">
                  <p className="text-sm leading-relaxed m-0 whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: result.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              )}

              <div className="flex gap-3">
                <button className="btn btn-outline flex-1" onClick={reset}>{t('health.scan_another')}</button>
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
