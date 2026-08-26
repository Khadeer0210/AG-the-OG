import { useAIStatus, AI_STATES } from '../context/AIStatusContext'
import { Cpu, AlertTriangle, Loader2, CheckCircle, RefreshCw } from 'lucide-react'

const statusConfig = {
  [AI_STATES.READY]: {
    color: 'var(--color-paddy)',
    bg: 'var(--color-paddy-soft)',
    icon: CheckCircle,
    label: 'AI Ready',
    pulse: false,
  },
  [AI_STATES.CHECKING]: {
    color: 'var(--color-turmeric)',
    bg: 'var(--color-turmeric-soft)',
    icon: Loader2,
    label: 'Checking AI...',
    pulse: true,
  },
  [AI_STATES.INITIALIZING]: {
    color: 'var(--color-turmeric)',
    bg: 'var(--color-turmeric-soft)',
    icon: Loader2,
    label: 'AI Starting...',
    pulse: true,
  },
  [AI_STATES.MODEL_LOADING]: {
    color: 'var(--color-turmeric)',
    bg: 'var(--color-turmeric-soft)',
    icon: Loader2,
    label: 'Loading Model...',
    pulse: true,
  },
  [AI_STATES.DEGRADED]: {
    color: 'var(--color-laterite)',
    bg: 'var(--color-alert-soft)',
    icon: AlertTriangle,
    label: 'AI Degraded',
    pulse: false,
  },
  [AI_STATES.OLLAMA_UNAVAILABLE]: {
    color: 'var(--color-alert)',
    bg: 'var(--color-alert-soft)',
    icon: AlertTriangle,
    label: 'AI Offline',
    pulse: false,
  },
  [AI_STATES.MODEL_UNAVAILABLE]: {
    color: 'var(--color-alert)',
    bg: 'var(--color-alert-soft)',
    icon: AlertTriangle,
    label: 'Model Missing',
    pulse: false,
  },
  [AI_STATES.ERROR]: {
    color: 'var(--color-alert)',
    bg: 'var(--color-alert-soft)',
    icon: AlertTriangle,
    label: 'AI Error',
    pulse: false,
  },
}

export default function AIStatusIndicator({ compact = true }) {
  const { status, model, lastError, isLoading, refreshStatus, isAIReady } = useAIStatus()

  const config = statusConfig[status] || statusConfig[AI_STATES.ERROR]
  const Icon = config.icon

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95 select-none"
        style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}22` }}
        onClick={refreshStatus}
        title={`${config.label}${model ? ` · ${model}` : ''}${lastError ? `\n${lastError}` : ''}\nClick to refresh`}
      >
        <Icon size={12} className={config.pulse ? 'animate-spin' : ''} />
        <span>{config.label}</span>
        {isAIReady && model && (
          <span style={{ opacity: 0.6, fontWeight: 400, fontSize: '10px' }}>· {model.split(':')[0]}</span>
        )}
      </div>
    )
  }

  // Expanded variant (for use in pages/modals)
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
      style={{ background: config.bg, border: `1px solid ${config.color}22` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: config.color + '20' }}
      >
        <Icon size={16} style={{ color: config.color }} className={config.pulse ? 'animate-spin' : ''} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold" style={{ color: config.color }}>
          {config.label}
        </div>
        {model && (
          <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
            Model: {model}
          </div>
        )}
        {lastError && !isAIReady && (
          <div className="text-[10px] truncate" style={{ color: 'var(--color-muted)' }}>
            {lastError}
          </div>
        )}
      </div>
      <button
        onClick={refreshStatus}
        className="p-1.5 rounded-lg transition-colors"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: config.color }}
        title="Refresh AI status"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}

/**
 * Inline AI status banner — shows when AI is not ready
 * Use in pages that depend on AI functionality
 */
export function AIStatusBanner({ className = '' }) {
  const { status, isAIReady, isAIInitializing, lastError, refreshStatus } = useAIStatus()

  if (isAIReady) return null

  const config = statusConfig[status] || statusConfig[AI_STATES.ERROR]
  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${className}`}
      style={{ background: config.bg, border: `1px solid ${config.color}33` }}
    >
      <Icon size={16} style={{ color: config.color }} className={config.pulse ? 'animate-spin' : ''} />
      <div className="flex-1">
        <span className="font-semibold text-xs" style={{ color: config.color }}>
          {isAIInitializing
            ? 'AI services are starting up...'
            : 'AI services are currently unavailable.'}
        </span>
        <span className="text-xs ml-1" style={{ color: 'var(--color-muted)' }}>
          {isAIInitializing
            ? 'This may take a moment.'
            : 'Weather, maps, and field data are still available.'}
        </span>
      </div>
      <button
        onClick={refreshStatus}
        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0"
        style={{ background: config.color + '15', border: 'none', cursor: 'pointer', color: config.color }}
      >
        Retry
      </button>
    </div>
  )
}
