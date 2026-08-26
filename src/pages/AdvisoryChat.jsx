import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Mic, MicOff, Image, Volume2, VolumeX, Sparkles, Loader2, User, Bot, Upload, X, AlertTriangle } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'
import { AIStatusBanner } from '../components/AIStatusIndicator'
import { chat as ollamaChat, analyzePlant as ollamaVision } from '../services/ollamaService'

export default function AdvisoryChat() {
  const { t, i18n } = useTranslation()
  const { getAIContext } = useAppContext()
  const { isAIReady, isAIUnavailable, isAIInitializing, model: aiModel } = useAIStatus()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [tts, setTts] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const endRef = useRef(null)
  const recRef = useRef(null)
  const fileRef = useRef(null)

  const quickQs = [t('chat.q1'), t('chat.q2'), t('chat.q3'), t('chat.q4'), t('chat.q5'), t('chat.q6')]

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const getLangCode = () => {
    const map = { hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN' }
    return map[i18n.language] || 'en-IN'
  }

  const speak = (text) => {
    if (!tts || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = getLangCode(); u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onload = () => setImageBase64(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  const sendMessage = async (text) => {
    if ((!text.trim() && !imageBase64) || loading) return
    const content = text.trim() || (imageBase64 ? `📷 [${t('chat.image_sent')}]` : '')
    setMessages(prev => [...prev, { role: 'user', content, image: imagePreview, ts: new Date() }])
    setInput('')
    const sentImage = imageBase64
    setImageBase64(null); setImagePreview(null)
    setLoading(true)

    try {
      const aiContext = getAIContext()
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

      let data
      if (sentImage) {
        data = await ollamaVision(sentImage, text, i18n.language, aiContext)
      } else {
        data = await ollamaChat(text, history, i18n.language, aiContext)
      }

      if (data.offline) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || t('common.ai_offline'),
          ts: new Date(),
          isError: true
        }])
      } else {
        let reply = data.reply || data.error || ''
        if (data.disease) {
          reply = `🔬 **${t('health.disease')}**: ${data.disease}\n📊 ${t('health.confidence')}: ${data.confidence}%\n⚠️ ${t('health.severity')}: ${data.severity}\n\n🌿 **${t('health.organic')}**: ${data.organic_treatment}\n💊 **${t('health.chemical')}**: ${data.chemical_treatment}`
        }
        setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: new Date() }])
        speak(reply.replace(/[*#🔬📊⚠️🌿💊]/g, ''))
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('common.ai_offline'),
        ts: new Date(),
        isError: true
      }])
    } finally { setLoading(false) }
  }

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR(); rec.lang = getLangCode(); rec.continuous = false
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false) }
    rec.onend = () => setListening(false); rec.onerror = () => setListening(false)
    recRef.current = rec; rec.start(); setListening(true)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl m-0" style={{ fontFamily: 'var(--font-display)' }}>{t('chat.title')} 🌾</h1>
        <button onClick={() => setTts(!tts)} className="btn btn-outline text-xs py-2 px-3"
          style={tts ? { background: 'var(--color-paddy-soft)', borderColor: 'var(--color-paddy)', color: 'var(--color-paddy)' } : {}}>
          {tts ? <Volume2 size={14} /> : <VolumeX size={14} />} {t('chat.radio_mode')}
        </button>
      </div>

      {/* AI Status Banner */}
      <AIStatusBanner className="mb-2" />

      {/* Messages Area */}
      <div className="card flex-1 overflow-y-auto p-5 space-y-4 mb-4" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🧑‍🌾</div>
            <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>Krishi Saarthi</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
              {t('chat.welcome_desc')}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQs.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)', cursor: 'pointer', color: 'var(--color-ink)' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                style={{ background: m.isError ? 'var(--color-alert-soft)' : 'var(--color-turmeric-soft)' }}>
                {m.isError ? <AlertTriangle size={14} style={{ color: 'var(--color-alert)' }} /> : <Sparkles size={14} style={{ color: 'var(--color-turmeric)' }} />}
              </div>
            )}
            <div className="max-w-[75%]">
              {m.image && <img src={m.image} alt="" className="rounded-xl max-h-40 mb-2 w-auto" />}
              <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
                style={m.role === 'user'
                  ? { background: 'var(--color-turmeric)', color: '#fff', borderBottomRightRadius: 4 }
                  : m.isError
                    ? { background: 'var(--color-alert-soft)', border: '1px solid var(--color-alert)33', borderBottomLeftRadius: 4 }
                    : { background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)', borderBottomLeftRadius: 4 }
                }
                dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
              <div className="text-[10px] mt-1 px-1" style={{ color: 'var(--color-muted)' }}>
                {m.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'var(--color-paddy-soft)' }}>
                <User size={14} style={{ color: 'var(--color-paddy)' }} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'var(--color-turmeric-soft)' }}>
              <Sparkles size={14} style={{ color: 'var(--color-turmeric)' }} />
            </div>
            <div className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-turmeric)' }} /> {t('chat.thinking')}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img src={imagePreview} alt="" className="h-20 rounded-xl border" style={{ borderColor: 'var(--color-card-border)' }} />
          <button onClick={() => { setImagePreview(null); setImageBase64(null) }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-alert)', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <X size={10} />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex gap-2">
        <button onClick={toggleVoice} className="p-3 rounded-xl shrink-0 transition-all"
          style={{ background: listening ? 'var(--color-alert-soft)' : 'var(--color-card)', border: '1px solid var(--color-card-border)', cursor: 'pointer', color: listening ? 'var(--color-alert)' : 'var(--color-muted)' }}>
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button onClick={() => fileRef.current?.click()} className="p-3 rounded-xl shrink-0"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-card-border)', cursor: 'pointer', color: 'var(--color-muted)' }}>
          <Image size={18} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} style={{ display: 'none' }} />
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder={t('chat.placeholder')} disabled={loading} className="input flex-1" />
        <button onClick={() => sendMessage(input)} disabled={(!input.trim() && !imageBase64) || loading || isAIUnavailable}
          className="p-3 rounded-xl shrink-0 transition-all"
          style={{ background: 'var(--color-turmeric)', border: 'none', cursor: 'pointer', color: '#fff', opacity: (!input.trim() && !imageBase64) || loading || isAIUnavailable ? 0.5 : 1 }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
