import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MyFarm from './pages/MyFarm'
import PlantHealth from './pages/PlantHealth'
import Weather from './pages/Weather'
import AdvisoryChat from './pages/AdvisoryChat'
import Insurance from './pages/Insurance'
import CropLibrary from './pages/CropLibrary'
import Impact from './pages/Impact'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import MarketPrices from './pages/MarketPrices'
import LiveMonitoring from './pages/LiveMonitoring'
import Auth from './pages/Auth'

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/farm" element={<MyFarm />} />
        <Route path="/health" element={<PlantHealth />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/chat" element={<AdvisoryChat />} />
        <Route path="/insurance" element={<Insurance />} />
        <Route path="/library" element={<CropLibrary />} />
        <Route path="/market" element={<MarketPrices />} />
        <Route path="/monitoring" element={<LiveMonitoring />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
