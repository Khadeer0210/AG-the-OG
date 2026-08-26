import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const AppContext = createContext(null)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }) {
  const { i18n } = useTranslation()

  // Location state
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem('agri_location')
    return saved ? JSON.parse(saved) : null
  })
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showLocationModal, setShowLocationModal] = useState(false)

  // Weather state
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Market state
  const [market, setMarket] = useState([])
  const [marketLoading, setMarketLoading] = useState(false)

  // Farms & crops (from DB or empty)
  const [farms, setFarms] = useState([])
  const [crops, setCrops] = useState([])
  const [alerts, setAlerts] = useState([])

  // Check if location exists on mount
  useEffect(() => {
    if (!location) {
      setShowLocationModal(true)
    }
  }, [])

  // Fetch weather when location changes
  useEffect(() => {
    if (location?.lat && location?.lng) {
      fetchWeather(location.lat, location.lng)
      fetchMarket()
      fetchFarmsAndCrops()
      fetchAlerts()
    }
  }, [location?.lat, location?.lng])

  // Reverse geocode location name
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
      )
      const data = await res.json()
      const address = data.address || {}
      const name = address.village || address.town || address.city || address.county || address.state_district || 'Unknown'
      const state = address.state || ''
      return { name, state, display: `${name}, ${state}` }
    } catch {
      return { name: 'Unknown', state: '', display: `${lat.toFixed(2)}, ${lng.toFixed(2)}` }
    }
  }

  // Update location
  const updateLocation = useCallback(async (lat, lng) => {
    setLocationLoading(true)
    setLocationError(null)
    try {
      const geo = await reverseGeocode(lat, lng)
      const loc = { lat, lng, ...geo }
      setLocation(loc)
      localStorage.setItem('agri_location', JSON.stringify(loc))
      setShowLocationModal(false)
    } catch (err) {
      setLocationError('Failed to detect location')
    } finally {
      setLocationLoading(false)
    }
  }, [])

  // Request browser geolocation
  const requestGeolocation = useCallback(() => {
    setLocationLoading(true)
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      setLocationLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setLocationError(
          err.code === 1 ? 'Location permission denied. Please enter manually.'
          : 'Could not detect location. Please enter manually.'
        )
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [updateLocation])

  // Fetch current weather
  const fetchWeather = async (lat, lng) => {
    setWeatherLoading(true)
    try {
      const res = await fetch(`/api/weather.php?action=current&lat=${lat}&lng=${lng}`)
      if (res.ok) {
        const data = await res.json()
        setWeather(data)
      } else {
        // Direct Open-Meteo fallback (bypass PHP)
        await fetchWeatherDirect(lat, lng)
      }
    } catch {
      await fetchWeatherDirect(lat, lng)
    } finally {
      setWeatherLoading(false)
    }
  }

  // Direct Open-Meteo fetch (if PHP backend not available)
  const fetchWeatherDirect = async (lat, lng) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`
      const res = await fetch(url)
      const data = await res.json()
      const c = data.current || {}
      const weatherCodeMap = {
        0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'],
        3: ['Overcast', '☁️'], 45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'],
        51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Dense drizzle', '🌦️'],
        61: ['Slight rain', '🌧️'], 63: ['Moderate rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
        80: ['Slight showers', '🌧️'], 81: ['Moderate showers', '🌧️'], 82: ['Violent showers', '🌧️'],
        95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm + hail', '⛈️'], 99: ['Severe thunderstorm', '⛈️'],
      }
      const code = c.weather_code ?? 0
      const [condition, icon] = weatherCodeMap[code] || ['Unknown', '🌡️']
      setWeather({
        temp: c.temperature_2m ?? 0,
        humidity: c.relative_humidity_2m ?? 0,
        feels_like: c.apparent_temperature ?? 0,
        precipitation: c.precipitation ?? 0,
        wind_speed: c.wind_speed_10m ?? 0,
        condition,
        icon,
        source: 'Open-Meteo (direct)',
      })
    } catch {
      setWeather(null)
    }
  }

  // Fetch market data
  const fetchMarket = async () => {
    setMarketLoading(true)
    try {
      const res = await fetch('/api/market.php?action=prices')
      if (res.ok) {
        const data = await res.json()
        setMarket(data.prices || [])
      }
    } catch {
      // Market data unavailable
      setMarket([])
    } finally {
      setMarketLoading(false)
    }
  }

  // Fetch farms and crops
  const fetchFarmsAndCrops = async () => {
    try {
      const [farmsRes, cropsRes] = await Promise.all([
        fetch('/api/farms.php').catch(() => null),
        fetch('/api/crops.php').catch(() => null),
      ])
      if (farmsRes?.ok) {
        const d = await farmsRes.json()
        setFarms(d.farms || d || [])
      }
      if (cropsRes?.ok) {
        const d = await cropsRes.json()
        setCrops(d.crops || d || [])
      }
    } catch {
      // DB not available
    }
  }

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts.php')
      if (res?.ok) {
        const d = await res.json()
        setAlerts(d.alerts || d || [])
      }
    } catch {
      setAlerts([])
    }
  }

  // Build context summary for AI
  const getAIContext = useCallback(() => {
    const ctx = {}
    if (location) {
      ctx.location = `${location.display} (${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)})`
    }
    if (weather) {
      ctx.weather = `${weather.temp}°C, ${weather.condition}, humidity ${weather.humidity}%, wind ${weather.wind_speed} km/h`
    }
    if (crops.length > 0) {
      ctx.crops = crops.map(c => `${c.crop} (${c.stage})`).join(', ')
    }
    if (market.length > 0) {
      ctx.market = market.slice(0, 5).map(m => `${m.crop}: ₹${m.price}`).join(', ')
    }
    return ctx
  }, [location, weather, crops, market])

  const value = {
    // Location
    location,
    locationLoading,
    locationError,
    showLocationModal,
    setShowLocationModal,
    updateLocation,
    requestGeolocation,
    // Weather
    weather,
    weatherLoading,
    fetchWeather: () => location && fetchWeather(location.lat, location.lng),
    // Market
    market,
    marketLoading,
    // Data
    farms,
    crops,
    alerts,
    setAlerts,
    fetchFarmsAndCrops,
    fetchAlerts,
    // AI helper
    getAIContext,
    // Language shortcut
    language: i18n.language,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
