// ═══════════════════════════════════════════════════════
// AGRI VISION — Source Badge Component
// Shows the data source origin (Live, AI Estimated, etc.)
// ═══════════════════════════════════════════════════════
import { DATA_SOURCES, getSourceLabel } from '../services/dataSourceService'
import { Wifi, WifiOff, Sparkles, Database, Calculator } from 'lucide-react'

const ICONS = {
  [DATA_SOURCES.REAL_API]: Wifi,
  [DATA_SOURCES.DATABASE]: Database,
  [DATA_SOURCES.CALCULATED]: Calculator,
  [DATA_SOURCES.AI_ESTIMATE]: Sparkles,
  [DATA_SOURCES.FALLBACK]: WifiOff,
  [DATA_SOURCES.SIMULATED]: Calculator,
}

export default function SourceBadge({ source, className = '' }) {
  const { label, color, bg } = getSourceLabel(source)
  const Icon = ICONS[source] || Wifi

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${className}`}
      style={{ background: bg, color }}
    >
      <Icon size={10} />
      {label}
    </span>
  )
}
