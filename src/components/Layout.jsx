import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import ChatWidget from './ChatWidget'
import LocationModal from './LocationModal'

export default function Layout() {
  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col" style={{ background: '#000000', color: '#ffffff' }}>
      {/* Site-wide Ambient Gradient Washes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Top-left dark blue glow */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.12]"
          style={{ background: '#1c2e4a' }} />
        {/* Bottom-right subtle metallic wash */}
        <div className="absolute top-[40%] -right-32 w-[550px] h-[550px] rounded-full blur-[140px] opacity-[0.08]"
          style={{ background: '#3a3a3a' }} />
        {/* Vesper noise/grain texture */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }} />
      </div>

      <Header />
      <LocationModal />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10 flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
