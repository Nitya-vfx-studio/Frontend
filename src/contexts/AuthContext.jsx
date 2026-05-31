import { createContext, useState, useEffect } from 'react'
import { login as loginApi, googleLogin as googleLoginApi } from '../services/authService'

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

  const loginAction = async (username, password) => {
    setIsLoading(true)
    try {
      const res = await loginApi(username, password)
      const { access_token, user: userPayload } = res.data
      
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userPayload))
      
      setToken(access_token)
      setUser(userPayload)
      return userPayload
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

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
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
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

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    loginAction,
    loginWithGoogleAction,
    logoutAction,
    updateUserAction,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
