import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Leaf, CloudRain, Thermometer, AlertTriangle, Download, Info, CheckCircle, XCircle, HelpCircle, FileText, Sparkles, Loader2, MapPin, TrendingDown, Activity, BarChart3 } from 'lucide-react'
import AnimatedCounter from '../components/AnimatedCounter'
import SourceBadge from '../components/SourceBadge'
import { useField } from '../context/FieldProvider'
import { runAssessment, getPolicies, generateFrontendEstimate } from '../services/ndviService'

const WEIGHTS = { ndvi: 0.55, rain: 0.30, heat: 0.15 }

export default function Insurance() {
  const { t } = useTranslation()
  const { farms, selectedFarm, selectFarm, farmCrops, allCrops, getCropsForFarm } = useField()

  const [selectedCropId, setSelectedCropId] = useState('')
  const [assessed, setAssessed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [policies, setPolicies] = useState([])
  const [showWhy, setShowWhy] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFarmId, setSelectedFarmId] = useState(selectedFarm?.id || '')

  // Load policies on mount
  useEffect(() => {
    getPolicies().then(p => setPolicies(p)).catch(() => {})
  }, [])

  // Sync selected farm
  useEffect(() => {
    if (selectedFarm?.id) setSelectedFarmId(String(selectedFarm.id))
  }, [selectedFarm])

  // Get crops for selected farm
  const currentFarm = farms.find(f => String(f.id) === String(selectedFarmId))
  const cropsForFarm = currentFarm ? getCropsForFarm(currentFarm.id) : []

  const handleFarmChange = (farmId) => {
    setSelectedFarmId(farmId)
    setSelectedCropId('')
    setAssessed(false)
    setAssessment(null)
    setError(null)
    const farm = farms.find(f => String(f.id) === String(farmId))
    if (farm) selectFarm(farm)
  }

  const handleCropChange = (cropId) => {
    setSelectedCropId(cropId)
    setAssessed(false)
    setAssessment(null)
    setError(null)
  }

  const runInsuranceAssessment = async () => {
    if (!selectedCropId) return
    setLoading(true)
    setError(null)
    try {
      const selectedCrop = allCrops.find(c => String(c.id) === String(selectedCropId))
      // Try backend first
      let result = await runAssessment(selectedCropId)
      if (!result || result.error) {
        // Frontend fallback
        result = generateFrontendEstimate(selectedCropId, selectedCrop)
      }
      setAssessment(result)
      setAssessed(true)
    } catch (err) {
      setError('Assessment failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const d = assessment || {}
  const ndviPct = ((d.ndvi_now || 0) / 1) * 100
  const basePct = ((d.ndvi_base || 0) / 1) * 100

  // Find policy for selected crop
  const cropPolicy = policies.find(p => String(p.crop_id) === String(selectedCropId))
  const selectedCrop = allCrops.find(c => String(c.id) === String(selectedCropId))

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="eyebrow-label">
          <Shield size={13} /> Parametric Claim & Satellite Evidence Engine
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-extrabold m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            {t('insurance.title')} <span className="text-gold-italic">Protection</span> 🛡️
          </h1>
          {assessment?.source && <SourceBadge source={assessment.source === 'frontend_estimate' ? 'calculated' : 'real_api'} />}
        </div>
      </div>

      {/* Farm + Crop Selector */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          <MapPin size={14} className="inline mr-1.5" style={{ color: 'var(--color-paddy)' }} />
          {t('insurance.select_farm')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <select className="input" value={selectedFarmId} onChange={e => handleFarmChange(e.target.value)}>
            <option value="">Select Farm...</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.area_ha || '?'} ha · {f.soil_type || 'Unknown Soil'})
              </option>
            ))}
          </select>
          <select className="input" value={selectedCropId} onChange={e => handleCropChange(e.target.value)} disabled={!selectedFarmId}>
            <option value="">Select Crop...</option>
            {cropsForFarm.map(c => (
              <option key={c.id} value={c.id}>
                {c.crop} — {c.variety || 'Unknown'} ({c.stage || 'Unknown Stage'})
              </option>
            ))}
          </select>
        </div>

        {/* Policy Info */}
        {cropPolicy && (
          <div className="p-3 rounded-xl mb-4 flex items-center justify-between flex-wrap gap-2" style={{ background: 'var(--color-paddy-soft)', border: '1px solid rgba(47,125,79,0.15)' }}>
            <div className="flex items-center gap-2 text-xs">
              <Shield size={14} style={{ color: 'var(--color-paddy)' }} />
              <span className="font-bold" style={{ color: 'var(--color-paddy)' }}>{cropPolicy.scheme}</span>
              <span style={{ color: 'var(--color-muted)' }}>· Sum Insured: ₹{Number(cropPolicy.sum_insured).toLocaleString()}</span>
            </div>
            <span className="chip chip-healthy text-[10px]">
              <CheckCircle size={10} /> {cropPolicy.status || 'Active'}
            </span>
          </div>
        )}

        {selectedCrop && !cropPolicy && selectedCropId && (
          <div className="p-3 rounded-xl mb-4 text-xs" style={{ background: 'var(--color-turmeric-soft)', color: 'var(--color-turmeric)' }}>
            <AlertTriangle size={13} className="inline mr-1" />
            No insurance policy found for this crop. Assessment will use default PMFBY parameters.
          </div>
        )}

        <button className="btn btn-primary w-full py-3" disabled={!selectedCropId || loading} onClick={runInsuranceAssessment}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Running Parametric Assessment...</> : <><Shield size={16} /> Run Parametric Assessment</>}
        </button>
      </div>

      {error && (
        <div className="alert-banner severity-amber">
          <AlertTriangle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* No Farms Empty State */}
      {farms.length === 0 && (
        <div className="card p-8 text-center">
          <Shield size={40} className="mx-auto mb-3" style={{ color: 'var(--color-muted)', opacity: 0.3 }} />
          <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>No Farms Registered</h3>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Register a farm in My Farm to run parametric insurance assessments.
          </p>
        </div>
      )}

      {assessed && assessment && (
        <div className="space-y-5" style={{ animation: 'fade-up 0.5s var(--ease-monsoon) forwards' }}>
          {/* Crop Context Banner */}
          {selectedCrop && (
            <div className="card p-4 flex items-center justify-between flex-wrap gap-3" style={{ background: 'linear-gradient(135deg, var(--color-paddy-soft) 0%, var(--color-card) 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#fff' }}>🌾</div>
                <div>
                  <div className="text-sm font-bold">{selectedCrop.crop} — {selectedCrop.variety}</div>
                  <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    Stage: {selectedCrop.stage} · Planted: {selectedCrop.plant_date || 'N/A'}
                    {d.days_since_plant ? ` · Day ${d.days_since_plant}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip text-xs" style={{ background: (d.veg_color || 'var(--color-alert)') + '20', color: d.veg_color || 'var(--color-alert)' }}>
                  <Activity size={11} /> {d.veg_health || 'Unknown'}
                </span>
              </div>
            </div>
          )}

          {/* NDVI Gauge */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold m-0" style={{ fontFamily: 'var(--font-display)' }}>
                <Leaf size={16} className="inline mr-1" style={{ color: 'var(--color-paddy)' }} /> {t('insurance.ndvi_gauge')}
              </h3>
              <span className="chip text-xs" style={{ background: (d.veg_color || 'var(--color-alert)') + '20', color: d.veg_color || 'var(--color-alert)' }}>{d.veg_health || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-8 flex-wrap">
              {/* Gauge Circle */}
              <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-card-border)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={d.ndvi_now > 0.5 ? 'var(--color-paddy)' : d.ndvi_now > 0.3 ? 'var(--color-turmeric)' : 'var(--color-alert)'}
                    strokeWidth="2.5" strokeDasharray={`${ndviPct} ${100 - ndviPct}`} strokeLinecap="round" className="transition-all duration-1000" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-paddy)" strokeWidth="1" strokeDasharray={`1 ${100 - 1}`}
                    strokeDashoffset={-basePct} opacity="0.5" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: d.ndvi_now > 0.5 ? 'var(--color-paddy)' : 'var(--color-alert)' }}>{d.ndvi_now}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>NDVI</span>
                </div>
              </div>
              {/* Comparison */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted)' }}>Current NDVI</span>
                  <span className="font-bold" style={{ color: d.ndvi_now > 0.5 ? 'var(--color-paddy)' : 'var(--color-alert)' }}>{d.ndvi_now}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted)' }}>{t('insurance.baseline')}</span>
                  <span className="font-bold" style={{ color: 'var(--color-paddy)' }}>{d.ndvi_base}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted)' }}>NDVI Stress</span>
                  <span className="font-bold" style={{ color: 'var(--color-alert)' }}>{d.ndvi_stress}%</span>
                </div>
                <div className="vine-bar mt-2">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, d.ndvi_stress || 0)}%`, background: 'linear-gradient(90deg, var(--color-turmeric), var(--color-alert))',
                    animation: 'vine-grow 1.5s var(--ease-monsoon) forwards', transformOrigin: 'left',
                  }} />
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                  Source: {d.source === 'frontend_estimate' ? 'Synthetic NDVI (phenology curve)' : 'NDVIEngine (crop-curve × rain × temp × soil)'}
                </div>
              </div>
            </div>
          </div>

          {/* Loss Model — 3 Stress Bars */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold m-0" style={{ fontFamily: 'var(--font-display)' }}>
                <BarChart3 size={16} className="inline mr-1.5" style={{ color: 'var(--color-laterite)' }} />
                {t('insurance.loss_model')}
              </h3>
              <button onClick={() => setShowWhy(!showWhy)} className="btn btn-ghost text-xs py-1 px-2">
                <HelpCircle size={13} /> {t('insurance.why_this_number')}
              </button>
            </div>

            <div className="space-y-4">
              {[
                { icon: Leaf, label: `${t('insurance.ndvi_stress')} (w=${WEIGHTS.ndvi})`, value: d.ndvi_stress || 0, color: 'var(--color-paddy)', weight: WEIGHTS.ndvi },
                { icon: CloudRain, label: `${t('insurance.rain_stress')} (w=${WEIGHTS.rain})`, value: d.rain_stress || 0, color: 'var(--color-rain)', weight: WEIGHTS.rain },
                { icon: Thermometer, label: `${t('insurance.heat_stress')} (w=${WEIGHTS.heat})`, value: d.heat_stress || 0, color: 'var(--color-laterite)', weight: WEIGHTS.heat },
              ].map(({ icon: Icon, label, value, color }, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5"><Icon size={14} style={{ color }} /> {label}</span>
                    <span className="font-bold">{Number(value).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-card-border)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, value)}%`, background: color, animation: 'ndvi-bar 1s var(--ease-monsoon) forwards', transformOrigin: 'left' }} />
                  </div>
                </div>
              ))}

              {/* Total Loss */}
              <div className="p-4 rounded-xl mt-2" style={{ background: d.eligible ? 'var(--color-alert-soft)' : 'var(--color-paddy-soft)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold flex items-center gap-1.5">
                    {d.eligible ? <AlertTriangle size={16} style={{ color: 'var(--color-alert)' }} /> : <CheckCircle size={16} style={{ color: 'var(--color-paddy)' }} />}
                    {t('insurance.total_loss')}
                  </span>
                  <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: d.eligible ? 'var(--color-alert)' : 'var(--color-paddy)' }}>
                    {Number(d.loss_pct || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  {t('insurance.threshold')}: {d.threshold || 20}% · Formula: 0.55×NDVI + 0.30×Rain + 0.15×Heat
                </div>
              </div>
            </div>

            {/* Why This Number */}
            {showWhy && (
              <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: 'var(--color-turmeric-soft)', border: '1px solid var(--color-turmeric)33' }}>
                <h4 className="font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-turmeric)' }}>
                  <Info size={14} /> {t('insurance.why_this_number')}
                </h4>
                <ul className="list-none p-0 m-0 space-y-1 text-xs">
                  <li><strong>NDVI Stress (55%):</strong> Vegetation index changed from {d.ndvi_base} → {d.ndvi_now}, indicating {Number(d.ndvi_stress || 0).toFixed(1)}% decline.</li>
                  <li><strong>Rain Stress (30%):</strong> {d.rain_actual > 0 ? `Received ${d.rain_actual}mm vs expected ${d.rain_expected}mm` : 'Rain data from Open-Meteo analysis'} — stress {Number(d.rain_stress || 0).toFixed(1)}%.</li>
                  <li><strong>Heat Stress (15%):</strong> {d.heat_days || 0} out of {d.heat_total || 30} days exceeded crop heat threshold ({Number(d.heat_stress || 0).toFixed(1)}% stress).</li>
                  <li className="pt-1"><strong>Total:</strong> (0.55 × {Number(d.ndvi_stress || 0).toFixed(1)}) + (0.30 × {Number(d.rain_stress || 0).toFixed(1)}) + (0.15 × {Number(d.heat_stress || 0).toFixed(1)}) = <strong>{Number(d.loss_pct || 0).toFixed(1)}%</strong></li>
                </ul>
              </div>
            )}
          </div>

          {/* Eligibility & Payout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('insurance.sum_insured')}</div>
              <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>₹<AnimatedCounter target={d.sum_insured || 0} /></div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('insurance.premium')} ({d.premium_rate || '2%'})</div>
              <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-rain)' }}>₹<AnimatedCounter target={d.premium || 0} /></div>
            </div>
            <div className="card p-4 text-center" style={{ background: d.eligible ? 'var(--color-paddy-soft)' : 'var(--color-card)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{t('insurance.payout')}</div>
              <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-paddy)' }}>
                {d.eligible ? <>₹<AnimatedCounter target={d.payout || 0} /></> : '—'}
              </div>
              <div className="mt-1">
                {d.eligible
                  ? <span className="chip chip-healthy text-[10px]"><CheckCircle size={10} /> {t('insurance.eligible')}</span>
                  : <span className="chip chip-danger text-[10px]"><XCircle size={10} /> {t('insurance.not_eligible')}</span>
                }
              </div>
            </div>
          </div>

          {/* Evidence Hash + Download */}
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
              <span className="font-semibold">{t('insurance.evidence_hash')}:</span>{' '}
              <code className="text-[10px]">{(d.hash || '').slice(0, 24)}...</code>
            </div>
            <button className="btn btn-primary text-sm"><Download size={15} /> {t('insurance.generate_claim')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
