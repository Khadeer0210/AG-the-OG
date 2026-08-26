import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FlaskConical, Save, Loader2, Info } from 'lucide-react'

const PARAMETERS = [
  { key: 'ph', label: 'pH', unit: '', min: 0, max: 14, low: 6.0, high: 7.5, step: 0.1 },
  { key: 'n', label: 'Nitrogen (N)', unit: 'kg/ha', min: 0, max: 600, low: 200, high: 300, step: 1 },
  { key: 'p', label: 'Phosphorus (P)', unit: 'kg/ha', min: 0, max: 200, low: 25, high: 50, step: 1 },
  { key: 'k', label: 'Potassium (K)', unit: 'kg/ha', min: 0, max: 500, low: 150, high: 250, step: 1 },
  { key: 'organic_c', label: 'Organic Carbon', unit: '%', min: 0, max: 5, low: 0.5, high: 1.5, step: 0.01 },
  { key: 'ec', label: 'Electrical Conductivity', unit: 'dS/m', min: 0, max: 10, low: 0, high: 1.0, step: 0.01 },
  { key: 'zinc', label: 'Zinc (Zn)', unit: 'ppm', min: 0, max: 50, low: 0.6, high: 5, step: 0.1 },
  { key: 'iron', label: 'Iron (Fe)', unit: 'ppm', min: 0, max: 100, low: 4.5, high: 20, step: 0.1 },
  { key: 'manganese', label: 'Manganese (Mn)', unit: 'ppm', min: 0, max: 50, low: 2, high: 10, step: 0.1 },
  { key: 'sulphur', label: 'Sulphur (S)', unit: 'ppm', min: 0, max: 100, low: 10, high: 40, step: 0.1 },
]

function getStatus(val, low, high) {
  if (val === '' || val === null || val === undefined) return 'empty'
  const v = parseFloat(val)
  if (isNaN(v)) return 'empty'
  if (v < low) return 'low'
  if (v > high) return 'high'
  return 'optimal'
}

const STATUS_COLORS = {
  low: { bg: 'var(--color-alert-soft)', color: 'var(--color-alert)', label: 'Low' },
  high: { bg: 'var(--color-turmeric-soft)', color: 'var(--color-turmeric)', label: 'High' },
  optimal: { bg: 'var(--color-paddy-soft)', color: 'var(--color-paddy)', label: 'Optimal' },
  empty: { bg: 'transparent', color: 'var(--color-muted)', label: '' },
}

export default function LabReportModal({ isOpen, onClose, farm, onSave }) {
  const { t } = useTranslation()
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [source, setSource] = useState('lab')

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  const handleSave = async () => {
    // At minimum, pH or NPK must be provided
    const hasData = ['ph', 'n', 'p', 'k'].some(k => values[k] !== undefined && values[k] !== '')
    if (!hasData) {
      setError('Please enter at least pH or NPK values')
      return
    }
    if (!farm?.id) {
      setError('No field selected')
      return
    }

    setSaving(true)
    setError('')

    try {
      const body = {
        farm_id: farm.id,
        ph: values.ph || null,
        n: values.n || null,
        p: values.p || null,
        k: values.k || null,
        organic_c: values.organic_c || null,
        source,
        micro_json: JSON.stringify({
          ec: values.ec || null,
          zinc: values.zinc || null,
          iron: values.iron || null,
          manganese: values.manganese || null,
          sulphur: values.sulphur || null,
        }),
      }

      const res = await fetch('/api/soil.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success || data.id) {
        onSave?.(body)
        setValues({})
        onClose()
      } else {
        setError(data.error || 'Failed to save report')
      }
    } catch {
      setError('Network error — backend may be offline')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-card)', border: '1px solid var(--color-card-border)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-rain-soft)' }}>
              <FlaskConical size={20} style={{ color: 'var(--color-rain)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>
                {t('farm.add_lab_report')}
              </h2>
              <p className="text-xs m-0" style={{ color: 'var(--color-muted)' }}>
                {farm?.name || 'Field'} — Enter soil test results
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Report Date</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="input w-full" style={{ appearance: 'auto' }}>
                <option value="lab">Lab Report</option>
                <option value="soilgrids">SoilGrids (Remote)</option>
                <option value="manual">Manual Entry</option>
              </select>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
            style={{ background: 'var(--color-rain-soft)', color: 'var(--color-rain)' }}>
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>Enter values from your soil test report. Leave fields blank if not tested. Colors indicate: <span style={{ color: 'var(--color-paddy)' }}>●Optimal</span> <span style={{ color: 'var(--color-alert)' }}>●Low</span> <span style={{ color: 'var(--color-turmeric)' }}>●High</span></span>
          </div>

          {/* Primary Parameters */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Primary Parameters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PARAMETERS.slice(0, 5).map(param => {
                const status = getStatus(values[param.key], param.low, param.high)
                const statusStyle = STATUS_COLORS[status]
                return (
                  <div key={param.key} className="p-3 rounded-xl"
                    style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">{param.label}</label>
                      {status !== 'empty' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={values[param.key] ?? ''}
                        onChange={e => handleChange(param.key, e.target.value)}
                        placeholder={`${param.low}–${param.high}`}
                        min={param.min} max={param.max} step={param.step}
                        className="input flex-1"
                        style={{ borderColor: status !== 'empty' ? statusStyle.color + '40' : undefined }}
                      />
                      {param.unit && (
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-muted)' }}>{param.unit}</span>
                      )}
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--color-muted)' }}>
                      Range: {param.low}–{param.high} {param.unit}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Micro-nutrients */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Micro-nutrients (Optional)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PARAMETERS.slice(5).map(param => {
                const status = getStatus(values[param.key], param.low, param.high)
                const statusStyle = STATUS_COLORS[status]
                return (
                  <div key={param.key} className="p-2 rounded-lg"
                    style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
                    <label className="text-xs font-medium block mb-1">{param.label}</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={values[param.key] ?? ''}
                        onChange={e => handleChange(param.key, e.target.value)}
                        placeholder={`${param.low}`} min={param.min} max={param.max} step={param.step}
                        className="input flex-1 text-sm" />
                      <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{param.unit}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="text-sm p-3 rounded-xl" style={{ background: 'var(--color-alert-soft)', color: 'var(--color-alert)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-canvas)' }}>
          <button onClick={onClose} className="btn btn-outline text-sm py-2 px-4">Cancel</button>
          <button onClick={handleSave} className="btn btn-primary text-sm py-2 px-4"
            disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Report</>}
          </button>
        </div>
      </div>
    </div>
  )
}
