import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAuthConfig } from '../api'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)
  const { loginWithGoogleAction } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await getAuthConfig()
        if (res.data?.google_client_id) {
          setGoogleClientId(res.data.google_client_id)
        }
      } catch (err) {
        console.error('Failed to load Google Auth configuration:', err)
      }
    }
    fetchConfig()
  }, [])

  const handleGoogleLogin = async (response) => {
    setError('')
    setLoading(true)
    try {
      const userPayload = await loginWithGoogleAction(response.credential)
      if (userPayload?.role === 'artist') {
        navigate('/artist')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Google authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return

    const initGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLogin,
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 356,
        })
      }
    }

    if (window.google) {
      initGoogleSignIn()
    } else {
      const checkInterval = setInterval(() => {
        if (window.google) {
          initGoogleSignIn()
          clearInterval(checkInterval)
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }
  }, [googleClientId])

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">🎬</div>
          <div className="login-title">Nitya VFX Studio</div>
          <div className="login-subtitle">Production Management System</div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
            <span className="spinner" />
          </div>
        ) : (
          <div ref={googleBtnRef} className="google-btn-container" />
        )}

        <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: 20 }}>
          Sign in with your registered Google account.
        </p>
      </div>
    </div>
  )
}
