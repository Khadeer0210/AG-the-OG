// ═══════════════════════════════════════════════════════
// AGRI VISION — Field Context Provider
// Central source of truth for the selected farm/field
// All modules consume field data from this provider
// ═══════════════════════════════════════════════════════
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { fetchFieldWeather } from '../services/weatherService'

const FieldContext = createContext(null)

export function useField() {
  const ctx = useContext(FieldContext)
  if (!ctx) throw new Error('useField must be used within FieldProvider')
  return ctx
}

export function FieldProvider({ children }) {
  const [farms, setFarms] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [farmCrops, setFarmCrops] = useState([])
  const [allCrops, setAllCrops] = useState([])
  const [farmSoil, setFarmSoil] = useState(null)
  const [farmWeather, setFarmWeather] = useState(null)
  const [farmNdvi, setFarmNdvi] = useState(null)
  const [farmsLoading, setFarmsLoading] = useState(true)
  const [fieldDataLoading, setFieldDataLoading] = useState(false)
  const [soilReports, setSoilReports] = useState([])
  const [insurancePolicies, setInsurancePolicies] = useState([])
  const mountedRef = useRef(true)

  // ── Load farms on mount ──
  const loadFarms = useCallback(async () => {
    setFarmsLoading(true)
    try {
      const [farmsRes, cropsRes] = await Promise.all([
        fetch('/api/farms.php').catch(() => null),
        fetch('/api/crops.php').catch(() => null),
      ])
      let farmsData = []
      let cropsData = []
      if (farmsRes?.ok) {
        const d = await farmsRes.json()
        farmsData = d.farms || d || []
      }
      if (cropsRes?.ok) {
        const d = await cropsRes.json()
        cropsData = d.crops || d || []
      }
      if (mountedRef.current) {
        setFarms(farmsData)
        setAllCrops(cropsData)
        // Auto-select first farm if none selected
        if (farmsData.length > 0 && !selectedFarm) {
          setSelectedFarm(farmsData[0])
        }
      }
    } catch {
      // Backend unavailable — use empty arrays
    } finally {
      if (mountedRef.current) setFarmsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadFarms()
    return () => { mountedRef.current = false }
  }, [loadFarms])

  // ── Load field-specific data when selectedFarm changes ──
  const loadFieldData = useCallback(async (farm) => {
    if (!farm?.id) return
    setFieldDataLoading(true)
    try {
      // Filter crops for this farm
      const crops = allCrops.filter(c => c.farm_id === farm.id || c.farm_id === String(farm.id))
      setFarmCrops(crops)

      // Fetch soil data
      try {
        const soilRes = await fetch(`/api/soil.php?action=report&farm_id=${farm.id}`)
        if (soilRes?.ok) {
          const soilData = await soilRes.json()
          if (mountedRef.current) setFarmSoil(soilData?.report || soilData || null)
        }
      } catch { /* Soil unavailable */ }

      // Fetch soil history
      try {
        const histRes = await fetch(`/api/soil.php?action=history&farm_id=${farm.id}`)
        if (histRes?.ok) {
          const histData = await histRes.json()
          if (mountedRef.current) setSoilReports(histData?.reports || [])
        }
      } catch { /* History unavailable */ }

      // Fetch weather for field location
      if (farm.lat && farm.lng) {
        try {
          const weather = await fetchFieldWeather(parseFloat(farm.lat), parseFloat(farm.lng))
          if (mountedRef.current) setFarmWeather(weather)
        } catch { /* Weather unavailable */ }
      }

      // Fetch insurance policies
      try {
        const insRes = await fetch(`/api/insurance.php?action=policies`)
        if (insRes?.ok) {
          const insData = await insRes.json()
          if (mountedRef.current) setInsurancePolicies(insData?.policies || [])
        }
      } catch { /* Insurance unavailable */ }

    } catch {
      // Field data unavailable
    } finally {
      if (mountedRef.current) setFieldDataLoading(false)
    }
  }, [allCrops])

  useEffect(() => {
    if (selectedFarm) {
      loadFieldData(selectedFarm)
    }
  }, [selectedFarm?.id, loadFieldData])

  // ── Select farm ──
  const selectFarm = useCallback((farm) => {
    setSelectedFarm(farm)
    setFarmSoil(null)
    setFarmWeather(null)
    setFarmNdvi(null)
  }, [])

  // ── Refresh all data ──
  const refreshFieldData = useCallback(async () => {
    await loadFarms()
    if (selectedFarm) {
      await loadFieldData(selectedFarm)
    }
  }, [loadFarms, loadFieldData, selectedFarm])

  // ── Refresh just farms and crops ──
  const refreshFarms = useCallback(async () => {
    await loadFarms()
  }, [loadFarms])

  // ── Get all crops for all farms ──
  const getCropsForFarm = useCallback((farmId) => {
    return allCrops.filter(c => c.farm_id === farmId || c.farm_id === String(farmId))
  }, [allCrops])

  const value = {
    // Farms
    farms,
    farmsLoading,
    selectedFarm,
    selectFarm,
    refreshFarms,
    refreshFieldData,
    // Field-specific data
    farmCrops,
    allCrops,
    farmSoil,
    farmWeather,
    farmNdvi,
    soilReports,
    insurancePolicies,
    fieldDataLoading,
    // Helpers
    getCropsForFarm,
    setFarms,
    setAllCrops,
  }

  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
}
