import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { checkHealth as ollamaCheckHealth, warmUp as ollamaWarmUp } from '../services/ollamaService'

const AIStatusContext = createContext(null)

export const AI_STATES = {
  INITIALIZING: 'INITIALIZING',
  OLLAMA_UNAVAILABLE: 'OLLAMA_UNAVAILABLE',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  MODEL_LOADING: 'MODEL_LOADING',
  READY: 'READY',
  DEGRADED: 'DEGRADED',
  ERROR: 'ERROR',
  CHECKING: 'CHECKING',
}

export function useAIStatus() {
  const ctx = useContext(AIStatusContext)
  if (!ctx) throw new Error('useAIStatus must be used within AIStatusProvider')
  return ctx
}

export function AIStatusProvider({ children }) {
  const [status, setStatus] = useState(AI_STATES.CHECKING)
  const [model, setModel] = useState(null)
  const [ollamaReachable, setOllamaReachable] = useState(false)
  const [modelAvailable, setModelAvailable] = useState(false)
  const [isWarm, setIsWarm] = useState(false)
  const [lastError, setLastError] = useState('')
  const [lastChecked, setLastChecked] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef(null)
  const mountedRef = useRef(true)

  const performCheck = useCallback(async (forceRefresh = false) => {
    try {
      const health = await ollamaCheckHealth(forceRefresh)

      if (!mountedRef.current) return

      setStatus(health.status || AI_STATES.ERROR)
      setModel(health.model || null)
      setOllamaReachable(health.ollama_reachable || false)
      setModelAvailable(health.model_available || false)
      setIsWarm(health.warm || false)
      setLastError(health.last_error || '')
      setLastChecked(new Date())
      setIsLoading(false)

      // Auto warm-up if ready but not warm
      if (health.status === 'READY' && !health.warm) {
        ollamaWarmUp().then(warmed => {
          if (mountedRef.current && warmed) setIsWarm(true)
        })
      }
    } catch {
      if (!mountedRef.current) return
      setStatus(AI_STATES.ERROR)
      setLastError('Health check failed')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    performCheck(true)
    intervalRef.current = setInterval(() => performCheck(false), 30000)
    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [performCheck])

  const isAIReady = status === AI_STATES.READY || status === 'READY'
  const isAIDegraded = status === AI_STATES.DEGRADED
  const isAIUnavailable = [
    AI_STATES.OLLAMA_UNAVAILABLE, AI_STATES.MODEL_UNAVAILABLE, AI_STATES.ERROR,
    'OLLAMA_UNAVAILABLE', 'MODEL_UNAVAILABLE', 'ERROR',
  ].includes(status)
  const isAIInitializing = [
    AI_STATES.INITIALIZING, AI_STATES.MODEL_LOADING, AI_STATES.CHECKING,
  ].includes(status)

  const refreshStatus = useCallback(() => performCheck(true), [performCheck])

  const value = {
    status, model, ollamaReachable, modelAvailable, isWarm,
    lastError, lastChecked, isLoading,
    isAIReady, isAIDegraded, isAIUnavailable, isAIInitializing,
    refreshStatus,
  }

  return <AIStatusContext.Provider value={value}>{children}</AIStatusContext.Provider>
}
