import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, Droplets, Calendar, Thermometer, Bug, Sparkles, ChevronDown, ChevronUp, Sprout, Filter, ArrowRight, ShieldCheck } from 'lucide-react'

const CROPS = [
  { id: 1, name: 'Paddy (Rice)', cat: 'Kharif', season: 'Kharif / Rabi', duration: '120-150 days', water: 'High (1200mm)', waterPct: 90, ph: '5.5-7.0', temp: '20-35°C', diseases: ['Blast', 'Brown spot', 'Sheath blight', 'BPH'], icon: '🌾', highlight: 'Staple cereal for over 60% of India' },
  { id: 2, name: 'Wheat', cat: 'Rabi', season: 'Rabi', duration: '120-150 days', water: 'Moderate (450mm)', waterPct: 45, ph: '6.0-7.5', temp: '15-25°C', diseases: ['Rust', 'Smut', 'Powdery mildew', 'Karnal bunt'], icon: '🌿', highlight: 'Cool season cereal, high protein' },
  { id: 3, name: 'Maize (Corn)', cat: 'Kharif', season: 'Kharif / Rabi', duration: '90-120 days', water: 'Moderate (500mm)', waterPct: 50, ph: '5.5-7.5', temp: '21-30°C', diseases: ['Fall armyworm', 'Turcicum leaf blight', 'Downy mildew'], icon: '🌽', highlight: 'Versatile grain & fodder crop' },
  { id: 4, name: 'Groundnut', cat: 'Kharif', season: 'Kharif', duration: '100-130 days', water: 'Low-Moderate (400mm)', waterPct: 35, ph: '5.5-7.0', temp: '25-30°C', diseases: ['Tikka disease', 'Collar rot', 'Stem rot'], icon: '🥜', highlight: 'Nitrogen-fixing oilseed crop' },
  { id: 5, name: 'Sugarcane', cat: 'Commercial', season: 'Year-round', duration: '12-18 months', water: 'Very High (1500mm)', waterPct: 98, ph: '6.0-7.5', temp: '20-35°C', diseases: ['Red rot', 'Smut', 'Wilt', 'Grassy shoot'], icon: '🎋', highlight: 'High commercial biomass cash crop' },
  { id: 6, name: 'Cotton', cat: 'Commercial', season: 'Kharif', duration: '150-180 days', water: 'Moderate (700mm)', waterPct: 65, ph: '6.0-8.0', temp: '21-35°C', diseases: ['Boll rot', 'Wilt', 'Leaf curl virus', 'Pink bollworm'], icon: '🏵️', highlight: 'White gold commercial fiber' },
  { id: 7, name: 'Soybean', cat: 'Kharif', season: 'Kharif', duration: '90-120 days', water: 'Moderate (450mm)', waterPct: 45, ph: '6.0-7.0', temp: '20-30°C', diseases: ['Rust', 'Yellow mosaic', 'Charcoal rot'], icon: '🫘', highlight: 'Rich plant-based protein source' },
  { id: 8, name: 'Tomato', cat: 'Vegetables', season: 'Year-round', duration: '60-90 days', water: 'Moderate (400mm)', waterPct: 40, ph: '6.0-7.0', temp: '20-27°C', diseases: ['Early blight', 'Late blight', 'Leaf curl', 'Fusarium wilt'], icon: '🍅', highlight: 'High-value horticulture crop' },
  { id: 9, name: 'Brinjal (Eggplant)', cat: 'Vegetables', season: 'Year-round', duration: '60-80 days', water: 'Moderate (400mm)', waterPct: 40, ph: '5.5-6.5', temp: '25-35°C', diseases: ['Shoot & fruit borer', 'Bacterial wilt', 'Phomopsis blight'], icon: '🍆', highlight: 'Continuous harvest vegetable' },
  { id: 10, name: 'Okra (Bhindi)', cat: 'Vegetables', season: 'Summer / Kharif', duration: '45-65 days', water: 'Low (300mm)', waterPct: 30, ph: '6.0-6.8', temp: '25-35°C', diseases: ['Yellow vein mosaic', 'Powdery mildew', 'Fruit borer'], icon: '🫑', highlight: 'Fast maturing summer vegetable' },
  { id: 11, name: 'Onion', cat: 'Vegetables', season: 'Rabi / Kharif', duration: '120-150 days', water: 'Low-Moderate (350mm)', waterPct: 35, ph: '6.0-7.0', temp: '15-25°C', diseases: ['Purple blotch', 'Stemphylium blight', 'Thrips'], icon: '🧅', highlight: 'Essential culinary spice bulb' },
  { id: 12, name: 'Turmeric', cat: 'Spices', season: 'Kharif', duration: '7-9 months', water: 'Moderate (800mm)', waterPct: 70, ph: '5.0-7.5', temp: '20-30°C', diseases: ['Rhizome rot', 'Leaf spot', 'Shoot borer'], icon: '🟡', highlight: 'Golden spice & medicinal crop' },
]

export default function CropLibrary() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [expanded, setExpanded] = useState(null)

  const categories = ['All', 'Kharif', 'Rabi', 'Vegetables', 'Commercial', 'Spices']

  const filtered = CROPS.filter(c => {
    const matchesCat = activeCategory === 'All' || c.cat === activeCategory
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.season.toLowerCase().includes(search.toLowerCase()) ||
      c.highlight.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const askAIAboutCrop = (cropName) => {
    const q = `Give me complete scientific agronomy advice for growing ${cropName}: soil preparation, seed rate, fertilizer schedule, and pest management.`
    navigate(`/chat?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="card p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-turmeric-soft) 0%, var(--color-card) 60%, var(--color-paddy-soft) 100%)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2"
              style={{ background: 'var(--color-paddy-soft)', color: 'var(--color-paddy)' }}>
              <Sprout size={13} /> {CROPS.length} Interactive Agronomy Guides
            </div>
            <h1 className="text-2xl sm:text-3xl m-0" style={{ fontFamily: 'var(--font-display)' }}>
              {t('library.title')} 📚
            </h1>
            <p className="text-xs sm:text-sm mt-1 m-0" style={{ color: 'var(--color-muted)' }}>
              Explore comprehensive scientific guides, soil requirements, water metrics, and disease diagnostics for Indian crops.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl animate-float shadow-sm"
            style={{ background: '#fff' }}>
            🌱
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('library.search')}
            className="input pl-11 py-3 text-sm rounded-xl" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
              style={{ color: 'var(--color-muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer"
              style={{
                background: activeCategory === cat ? 'linear-gradient(135deg, var(--color-paddy) 0%, var(--color-paddy-dark) 100%)' : 'var(--color-card)',
                color: activeCategory === cat ? '#fff' : 'var(--color-ink)',
                border: `1.5px solid ${activeCategory === cat ? 'var(--color-paddy)' : 'var(--color-card-border)'}`,
                boxShadow: activeCategory === cat ? '0 4px 12px rgba(47,125,79,0.25)' : 'none',
              }}>
              {cat} {cat === 'All' ? `(${CROPS.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Crops Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(crop => {
          const isOpen = expanded === crop.id
          return (
            <div key={crop.id} className="card overflow-hidden transition-all duration-300 hover:shadow-md"
              style={{ borderLeft: `4px solid ${isOpen ? 'var(--color-paddy)' : 'transparent'}` }}>
              <div onClick={() => setExpanded(isOpen ? null : crop.id)}
                className="p-5 flex items-start justify-between cursor-pointer select-none">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm transition-transform group-hover:scale-110"
                    style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-card-border)' }}>
                    {crop.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold m-0" style={{ fontFamily: 'var(--font-display)' }}>{crop.name}</h3>
                      <span className="chip text-[10px]" style={{ background: 'var(--color-turmeric-soft)', color: 'var(--color-turmeric-dark)' }}>
                        {crop.cat}
                      </span>
                    </div>
                    <p className="text-xs m-0 mt-1" style={{ color: 'var(--color-muted)' }}>{crop.highlight}</p>
                  </div>
                </div>
                <div className="p-1.5 rounded-lg shrink-0 ml-2" style={{ background: 'var(--color-canvas)', color: 'var(--color-muted)' }}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Quick Specs Strip */}
              <div className="px-5 pb-3 flex items-center justify-between text-xs" style={{ borderTop: '1px border-dashed var(--color-card-border)', color: 'var(--color-muted)' }}>
                <span className="flex items-center gap-1"><Calendar size={13} style={{ color: 'var(--color-turmeric)' }} /> {crop.duration}</span>
                <span className="flex items-center gap-1"><Droplets size={13} style={{ color: 'var(--color-rain)' }} /> {crop.water}</span>
                <span className="flex items-center gap-1"><Thermometer size={13} style={{ color: 'var(--color-laterite)' }} /> {crop.temp}</span>
              </div>

              {/* Expanded Details Accordion */}
              {isOpen && (
                <div className="px-5 pb-5 pt-3 space-y-4" style={{ background: 'var(--color-canvas)', borderTop: '1px solid var(--color-card-border)' }}>
                  {/* Water Meter */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: 'var(--color-muted)' }}>Water Requirement Gauge</span>
                      <span className="font-bold" style={{ color: 'var(--color-rain)' }}>{crop.water}</span>
                    </div>
                    <div className="vine-bar">
                      <div className="vine-bar-fill" style={{ width: `${crop.waterPct}%`, background: 'linear-gradient(90deg, var(--color-rain-soft), var(--color-rain))' }} />
                    </div>
                  </div>

                  {/* Grid Specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-card-border)' }}>
                      <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Season</div>
                      <div className="font-bold">{crop.season}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-card-border)' }}>
                      <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Soil pH Range</div>
                      <div className="font-bold text-emerald-700">{crop.ph}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border" style={{ borderColor: 'var(--color-card-border)' }}>
                      <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Optimal Temp</div>
                      <div className="font-bold">{crop.temp}</div>
                    </div>
                  </div>

                  {/* Disease Watch */}
                  <div>
                    <div className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-laterite)' }}>
                      <Bug size={14} /> Key Disease Watch
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {crop.diseases.map((d, i) => (
                        <span key={i} className="chip chip-laterite text-[10px]">{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* AI Quick Button */}
                  <button className="btn btn-paddy text-xs w-full py-2.5 rounded-xl shadow-sm"
                    onClick={(e) => { e.stopPropagation(); askAIAboutCrop(crop.name) }}>
                    <Sparkles size={14} /> Ask Krishi Saarthi AI About Growing {crop.name} <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Sprout size={48} className="mx-auto mb-3 opacity-40" style={{ color: 'var(--color-paddy)' }} />
          <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>No Crops Found</h3>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Try searching for a different crop name or changing the category filter.</p>
        </div>
      )}
    </div>
  )
}
