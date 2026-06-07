import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdmin, isOwner, isArtist, getRolePillClass, getRoleLabel } from '../utils/permissions'
import './Layout.css'


export default function Layout() {
  const navigate = useNavigate()
  const { user, logoutAction, isImpersonating, stopImpersonatingAction } = useAuth()

  const handleLogout = () => {
    logoutAction()
    navigate('/login')
  }

  const handleStopImpersonating = () => {
    stopImpersonatingAction()
    navigate('/login')
  }

  const userIsAdmin = isAdmin(user)
  const userIsOwner = isOwner(user)
  const userIsArtist = isArtist(user)
  const rolePillClass = getRolePillClass(user)
  const roleLabel = getRoleLabel(user)

  return (
    <div className="app-shell">
      {isImpersonating && (
        <div style={{
          background: 'var(--warning, #f59e0b)',
          color: '#000',
          textAlign: 'center',
          padding: '6px 16px',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          👤 You are viewing as <strong>{user?.display_name || user?.username}</strong>
          <button
            onClick={handleStopImpersonating}
            style={{ background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
          >
            Exit
          </button>
        </div>
      )}
      <nav className="top-nav">
        <NavLink to="/projects" className="nav-logo">
          🎬 Nitya <span>VFX Studio</span>
        </NavLink>

        <div className="nav-links">
          {userIsArtist && (
            <NavLink to="/artist" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              ⏱ My Portal
            </NavLink>
          )}

          <NavLink to="/projects" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            📁 Projects
          </NavLink>

          {userIsAdmin && (
            <>
              {userIsOwner && (
                <NavLink to="/users" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                  👥 Users
                </NavLink>
              )}
              <NavLink to="/time-logs" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                ⏱ Time Logs
              </NavLink>
              <NavLink to="/outsource" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                📤 Outsource
              </NavLink>
              {userIsOwner && (
                <>
                  <NavLink to="/salary" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                    💰 Salary
                  </NavLink>
                  <NavLink to="/payments" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                    💳 Payments
                  </NavLink>
                  <NavLink to="/invoices" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                    🧾 Invoices
                  </NavLink>
                </>
              )}
            </>
          )}
        </div>

        <div className="nav-right">
          <div className={`nav-pill ${rolePillClass}`}>
            {roleLabel} {user?.display_name || user?.username}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>⏻ Logout</button>
        </div>
      </nav>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}
