import { createContext, useContext, useState, useCallback } from 'react'
import { findManagedUser } from '../api/sync'
import { apiConfig } from '../api/config'

const AuthContext = createContext(null)

/* Mock user database — used as fallback when VITE_USE_MOCK_DATA=true */
const MOCK_USERS = {
  'picker@rmo.qa':   { id: '1', name: 'Ahmed Khalil',   email: 'picker@rmo.qa',  role: 'picker',  password: 'picker123' },
  'packer@rmo.qa':   { id: '2', name: 'Sara Al-Thani',  email: 'packer@rmo.qa',  role: 'packer',  password: 'packer123' },
  'driver@rmo.qa':   { id: '3', name: 'Omar Farooq',    email: 'driver@rmo.qa',  role: 'driver',  password: 'driver123' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rmo_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('rmo_token'))

  const login = useCallback(async (email, password) => {
    // ── Live mode: call API login endpoint ──
    if (!apiConfig.useMockData) {
      try {
        const response = await fetch(`${apiConfig.baseUrl.replace(/\/$/, '')}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          throw new Error('Invalid credentials')
        }

        const resData = await response.json()
        if (resData.success && resData.data?.token) {
          const userData = resData.data.user || {}
          const profile = {
            id: userData.id || '1',
            name: userData.name || email,
            email: userData.email || email,
            role: userData.role || 'driver',
          }

          localStorage.setItem('rmo_user', JSON.stringify(profile))
          localStorage.setItem('rmo_token', resData.data.token)
          setUser(profile)
          setToken(resData.data.token)
          return profile
        } else {
          throw new Error(resData.message || 'Invalid credentials')
        }
      } catch (err) {
        console.error('[Auth] Login failed:', err)
        throw err
      }
    }

    // ── Demo mode ──
    await new Promise(r => setTimeout(r, 800)) // simulate latency
    
    // 1. Check admin-managed users first (created via User Management page)
    const managedUser = findManagedUser(email)
    if (managedUser && managedUser.password === password) {
      const fakeToken = 'tok_' + Math.random().toString(36).slice(2)
      const profile = { id: managedUser.id, name: managedUser.name, email: managedUser.email, role: managedUser.role, locationId: managedUser.locationId }
      localStorage.setItem('rmo_user', JSON.stringify(profile))
      localStorage.setItem('rmo_token', fakeToken)
      setUser(profile)
      setToken(fakeToken)
      return profile
    }
    
    // 2. Fall back to hardcoded demo users
    const u = MOCK_USERS[email.toLowerCase()]
    if (!u || u.password !== password) throw new Error('Invalid credentials')
    const fakeToken = 'tok_' + Math.random().toString(36).slice(2)
    const profile = { id: u.id, name: u.name, email: u.email, role: u.role, locationId: u.locationId }
    localStorage.setItem('rmo_user', JSON.stringify(profile))
    localStorage.setItem('rmo_token', fakeToken)
    setUser(profile)
    setToken(fakeToken)
    return profile
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('rmo_user')
    localStorage.removeItem('rmo_token')
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
