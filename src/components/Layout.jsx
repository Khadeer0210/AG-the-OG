import { Outlet } from 'react-router-dom'
import Header from './Header'
import ChatWidget from './ChatWidget'
import LocationModal from './LocationModal'

export default function Layout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-canvas)' }}>
      <Header />
      <LocationModal />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  )
}
