import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROLES } from '../config/constants'
import { getAuthConfig } from '../api'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)
  const { loginAction, loginWithGoogleAction } = useAuth()
  const [role, setRole] = useState('admin')
  const [form, setForm] = useState({ username: '', password: '' })
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const userPayload = await loginAction(form.username, form.password)
      if (userPayload?.role === 'artist') {
        navigate('/artist')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selected = ROLES.find(r => r.value === role)

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">🎬</div>
          <div className="login-title">Nitya VFX Studio</div>
          <div className="login-subtitle">Production Management System</div>
        </div>

        <div className="role-drop-wrap">
          <label>Sign in as</label>
          <select
            className="role-select"
            value={role}
            onChange={e => { setRole(e.target.value); setError('') }}
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {selected && <p className="login-role-hint">{selected.hint}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              type="text"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoFocus required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Signing in…</> : `Enter as ${selected?.label}`}
          </button>
        </form>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <div ref={googleBtnRef} className="google-btn-container" />
      </div>
    </div>
  )
}
