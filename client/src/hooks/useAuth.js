import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authApi.me()
      setUser(data.user)
      setError('')
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (payload) => {
    await authApi.login(payload)
    await refresh()
  }, [refresh])

  const register = useCallback(async (payload) => {
    await authApi.register(payload)
    await refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  return useMemo(() => ({
    user,
    loading,
    error,
    setError,
    login,
    logout,
    register,
    refresh,
    isAuthenticated: Boolean(user),
  }), [error, loading, login, logout, refresh, register, user])
}
