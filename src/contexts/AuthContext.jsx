import { createContext, useState, useEffect } from 'react'
import { googleLogin as googleLoginApi, impersonate as impersonateApi } from '../services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize session from localStorage
    try {
      const savedToken = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      }
    } catch (err) {
      console.error('Failed to restore authentication session:', err)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginWithGoogleAction = async (idToken) => {
    setIsLoading(true)
    try {
      const res = await googleLoginApi(idToken)
      const { access_token, user: userPayload } = res.data
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userPayload))
      
      setToken(access_token)
      setUser(userPayload)
      return userPayload
    } finally {
      setIsLoading(false)
    }
  }

  const impersonateAction = async (userId) => {
    const res = await impersonateApi(userId)
    const { access_token, impersonating } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(impersonating))
    localStorage.setItem('impersonating', '1')
    setToken(access_token)
    setUser(impersonating)
    return impersonating
  }

  const stopImpersonatingAction = () => {
    // Logging out of impersonation returns admin to login — they re-auth with Google
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('impersonating')
    setToken(null)
    setUser(null)
  }

  const logoutAction = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const updateUserAction = (updatedUserData) => {
    try {
      const mergedUser = { ...user, ...updatedUserData }
      localStorage.setItem('user', JSON.stringify(mergedUser))
      setUser(mergedUser)
    } catch (err) {
      console.error('Failed to update local session metadata:', err)
    }
  }

  const isAuthenticated = !!token && !!user

  const isImpersonating = !!localStorage.getItem('impersonating')

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    isImpersonating,
    loginWithGoogleAction,
    impersonateAction,
    stopImpersonatingAction,
    logoutAction,
    updateUserAction,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
