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
        if (res.data?.google_client_id) setGoogleClientId(res.data.google_client_id)
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
      navigate(userPayload?.role === 'artist' ? '/artist' : '/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Google authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return
    const init = () => {
      if (!window.google) return
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleLogin })
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'filled_black', size: 'large', width: 340 })
    }
    if (window.google) { init() } else {
      const t = setInterval(() => { if (window.google) { init(); clearInterval(t) } }, 100)
      return () => clearInterval(t)
    }
  }, [googleClientId])

  return (
    <div className="login-page">
      {/* Layered background */}
      <div className="login-bg" />
      <div className="login-grain" />
      <div className="login-scanlines" />

      {/* Animated orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* Light streaks */}
      <div className="login-streak" />
      <div className="login-streak login-streak-2" />

      {/* Floating particles */}
      <div className="login-particles">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      {/* Card */}
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">🎬</div>
          <div className="login-title">Nitya VFX Studio</div>
          <div className="login-subtitle">Production Management System</div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>
        )}

        {/* Google button wrapper — our style is visual only, Google iframe sits on top invisible and receives the click */}
        <div className="google-btn-wrap">
          <div className="google-custom-btn" aria-hidden="true">
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18 }} />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </div>
          {/* Real Google button — transparent overlay, receives the actual click */}
          <div ref={googleBtnRef} className="google-btn-overlay" />
        </div>

        <div className="login-tagline">
          Sign in with your registered Google account.<br />
          <span>Bring Imaginations to Life</span>
        </div>

        <div className="login-services">
          {['Rotoscopy', 'Paint', 'Compositing', 'CGI'].map(s => (
            <span key={s} className="login-service-tag">{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
