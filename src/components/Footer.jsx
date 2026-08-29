import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sprout, ArrowRight, ShieldCheck, Heart, Leaf, Mail, Globe, MapPin } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-20 relative overflow-hidden text-white" style={{ background: 'var(--forest)' }}>
      {/* Topographic line art overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, var(--sprout) 0%, transparent 40%),
                            radial-gradient(circle at 80% 80%, var(--gold) 0%, transparent 40%)`
        }}
      />

      {/* Organic Wave Divider Top */}
      <div className="w-full overflow-hidden leading-none pointer-events-none -mt-1">
        <svg className="relative block w-full h-8 sm:h-12" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,60 L1200,0 L0,0 Z" fill="var(--cream)" opacity="1"></path>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">

          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--leaf), var(--sprout))' }}>
                <Sprout size={22} color="#fff" />
              </div>
              <div>
                <span className="text-xl font-bold block leading-none" style={{ fontFamily: 'var(--font-display)', color: '#FFF' }}>
                  AgriVision
                </span>
                <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--sprout)' }}>
                  Krishi Saarthi · Field AI
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(250, 247, 240, 0.75)' }}>
              Empowering small-scale Indian farmers with local Edge AI intelligence, precise hyper-local weather telemetry, and automated crop diagnostics.
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--sprout)' }}>
              <ShieldCheck size={16} /> <span>100% Offline Resilient · Privacy Preserved</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-sm font-extrabold uppercase tracking-widest mb-4 flex items-center gap-1.5"
              style={{ color: 'var(--gold)' }}>
              <Leaf size={14} /> Main Hub
            </h4>
            <ul className="space-y-2.5 text-sm list-none p-0 m-0">
              <li>
                <Link to="/" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Dashboard & Telemetry
                </Link>
              </li>
              <li>
                <Link to="/farm" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  My Farm & Soil Health
                </Link>
              </li>
              <li>
                <Link to="/health" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  LLaVA Plant Analyzer
                </Link>
              </li>
              <li>
                <Link to="/weather" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Weather & Climate Radar
                </Link>
              </li>
              <li>
                <Link to="/insurance" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Parametric Insurance
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: AI Intelligence Tools */}
          <div>
            <h4 className="text-sm font-extrabold uppercase tracking-widest mb-4 flex items-center gap-1.5"
              style={{ color: 'var(--gold)' }}>
              <Leaf size={14} /> AI Advisory
            </h4>
            <ul className="space-y-2.5 text-sm list-none p-0 m-0">
              <li>
                <Link to="/chat" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Multilingual AI Chatbot
                </Link>
              </li>
              <li>
                <Link to="/market" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Mandi Market Intelligence
                </Link>
              </li>
              <li>
                <Link to="/library" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Crop Knowledge Graph
                </Link>
              </li>
              <li>
                <Link to="/monitoring" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Live Field Telemetry
                </Link>
              </li>
              <li>
                <Link to="/impact" className="hover:text-[var(--sprout)] transition-colors no-underline" style={{ color: 'rgba(250,247,240,0.75)' }}>
                  Climate Sustainability
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1.5"
              style={{ color: 'var(--gold)' }}>
              <Mail size={14} /> Krishi Bulletin
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(250, 247, 240, 0.75)' }}>
              Subscribe to get weekly climate advisories, crop prices, and pest outbreak alerts tailored for Indian agriculture.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing to Krishi Bulletin!') }}
              className="flex items-center gap-2 p-1 rounded-full border bg-[rgba(255,255,255,0.08)]"
              style={{ borderColor: 'rgba(250,247,240,0.2)' }}>
              <input
                type="email"
                placeholder="Enter your email..."
                required
                className="bg-transparent text-xs px-3 py-2 text-white outline-none w-full placeholder:text-[rgba(250,247,240,0.5)]"
              />
              <button
                type="submit"
                className="btn btn-gold rounded-full px-4 py-2 text-xs font-bold shrink-0 flex items-center gap-1"
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
              >
                Join <ArrowRight size={13} />
              </button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-8" style={{ borderColor: 'rgba(250, 247, 240, 0.12)' }} />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ color: 'rgba(250, 247, 240, 0.6)' }}>
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} AgriVision (Krishi Saarthi). Built for Indian Farmers.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            <span className="flex items-center gap-1 text-[var(--sprout)] font-semibold">
              <Globe size={13} /> Multi-Language (EN, HI, TA, TE, KN)
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
