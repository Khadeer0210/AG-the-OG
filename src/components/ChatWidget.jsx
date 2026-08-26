import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, X, Send, Loader2, Mic, MicOff, Volume2, VolumeX, Sparkles, Minimize2, Maximize2, AlertTriangle } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAIStatus } from '../context/AIStatusContext'
import { chat as ollamaChat } from '../services/ollamaService'

export default function ChatWidget() {
  const { t, i18n } = useTranslation()
  const { getAIContext } = useAppContext()
  const { isAIReady, isAIInitializing, isAIUnavailable, status: aiStatus, model: aiModel } = useAIStatus()
  const [openState, setOpenState] = useState('closed') // 'closed' | 'open' | 'minimized'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const endRef = useRef(null)
  const recognitionRef = useRef(null)

  const quickQs = [t('chat.q1'), t('chat.q2'), t('chat.q3'), t('chat.q4')]

  useEffect(() => {
    if (openState === 'open') {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, openState])

  const speak = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(text)
    const langMap = { hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN' }
    u.lang = langMap[i18n.language] || 'en-IN'
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const aiContext = getAIContext()
      const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }))

      const data = await ollamaChat(text, history, i18n.language, aiContext)

      if (data.offline || !data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || t('common.ai_offline'), ts: new Date(), isError: true }])
      } else {
        const reply = data.reply
        setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: new Date() }])
        speak(reply)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('common.ai_offline'), ts: new Date(), isError: true }])
    } finally {
      setLoading(false)
    }
  }

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    const langMap = { hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', kn: 'kn-IN' }
    rec.lang = langMap[i18n.language] || 'en-IN'
    rec.continuous = false
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false) }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec; rec.start(); setListening(true)
  }

  // 1. Closed state floating button
  if (openState === 'closed') {
    return (
      <button onClick={() => setOpenState('open')} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, var(--color-turmeric) 0%, var(--color-turmeric-dark) 100%)', border: 'none', color: '#fff' }}
        title="Open Krishi Saarthi AI Chat">
        <MessageCircle size={24} />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full" style={{ background: 'var(--color-paddy)' }}>
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'var(--color-paddy)', opacity: 0.7 }} />
        </span>
      </button>
    )
  }

  // 2. Minimized compact pill mode (doesn't interfere with map)
  if (openState === 'minimized') {
    return (
      <div onClick={() => setOpenState('open')}
        className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg cursor-pointer transition-all hover:scale-105 border glass-panel"
        style={{ borderColor: 'var(--color-turmeric)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-turmeric-soft)' }}>
          <Sparkles size={15} style={{ color: 'var(--color-turmeric)' }} />
        </div>
        <div className="text-xs font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
          Krishi Saarthi AI <span className="font-normal text-[10px]" style={{ color: 'var(--color-muted)' }}>(Minimized)</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setOpenState('open') }}
          className="p-1 rounded-md" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
          <Maximize2 size={14} />
        </button>
      </div>
    )
  }

  // 3. Open Panel mode
  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[9999] w-full sm:w-[400px] h-[80vh] sm:h-[560px] flex flex-col sm:rounded-2xl overflow-hidden glass-panel shadow-2xl transition-all"
      style={{ border: '1px solid var(--color-card-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-card-border)', background: 'var(--color-card)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-turmeric-soft)' }}>
            <Sparkles size={16} style={{ color: 'var(--color-turmeric)' }} />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>{t('chat.title')}</div>
            <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
              {isAIReady ? `${aiModel || 'Ollama'} · ${i18n.language.toUpperCase()}` : isAIInitializing ? 'AI Starting...' : 'AI Offline'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setTtsEnabled(!ttsEnabled)} className="p-1.5 rounded-lg transition-colors" title={t('chat.radio_mode')}
            style={{ background: ttsEnabled ? 'var(--color-paddy-soft)' : 'transparent', border: 'none', cursor: 'pointer', color: ttsEnabled ? 'var(--color-paddy)' : 'var(--color-muted)' }}>
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={() => setOpenState('minimized')} className="p-1.5 rounded-lg transition-colors" title="Minimize Chat"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
            <Minimize2 size={16} />
          </button>
          <button onClick={() => setOpenState('closed')} className="p-1.5 rounded-lg transition-colors" title="Close Chat"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🌾</div>
            <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Krishi Saarthi</p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('chat.welcome_desc')}</p>
            {isAIUnavailable && (
              <div className="mt-3 px-3 py-2 rounded-xl text-[11px] flex items-center gap-2 justify-center"
                style={{ background: 'var(--color-alert-soft)', color: 'var(--color-alert)' }}>
                <AlertTriangle size={12} /> AI services are currently unavailable
              </div>
            )}
            {isAIInitializing && (
              <div className="mt-3 px-3 py-2 rounded-xl text-[11px] flex items-center gap-2 justify-center"
                style={{ background: 'var(--color-turmeric-soft)', color: 'var(--color-turmeric)' }}>
                <Loader2 size={12} className="animate-spin" /> AI is starting up...
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm"
              style={m.role === 'user'
                ? { background: 'linear-gradient(135deg, var(--color-turmeric) 0%, var(--color-turmeric-dark) 100%)', color: '#fff', borderBottomRightRadius: 4 }
                : m.isError
                  ? { background: 'var(--color-alert-soft)', color: 'var(--color-ink)', border: '1px solid var(--color-alert)33', borderBottomLeftRadius: 4 }
                  : { background: 'var(--color-card)', color: 'var(--color-ink)', border: '1px solid var(--color-card-border)', borderBottomLeftRadius: 4 }
              }
              dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-card-border)', color: 'var(--color-muted)' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-turmeric)' }} /> {t('chat.thinking')}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {quickQs.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)} className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-card-border)', color: 'var(--color-ink)', cursor: 'pointer' }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--color-card-border)', background: 'var(--color-card)' }}>
        <button onClick={toggleVoice} className="p-2.5 rounded-xl shrink-0 transition-colors"
          style={{ background: listening ? 'var(--color-alert-soft)' : 'var(--color-canvas)', border: '1px solid var(--color-card-border)', cursor: 'pointer', color: listening ? 'var(--color-alert)' : 'var(--color-muted)' }}>
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder={t('chat.placeholder')} disabled={loading}
          className="input flex-1 text-sm" style={{ borderRadius: 12 }} />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || isAIUnavailable}
          className="p-2.5 rounded-xl shrink-0 transition-colors"
          style={{ background: 'var(--color-turmeric)', border: 'none', cursor: 'pointer', color: '#fff', opacity: !input.trim() || loading || isAIUnavailable ? 0.5 : 1 }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
