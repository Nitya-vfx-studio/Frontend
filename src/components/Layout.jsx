import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdmin, isArtist, getRolePillClass, getRoleLabel } from '../utils/permissions'
import './Layout.css'

export default function Layout() {
  const navigate = useNavigate()
  const { user, logoutAction } = useAuth()

  const handleLogout = () => {
    logoutAction()
    navigate('/login')
  }

  const userIsAdmin = isAdmin(user)
  const userIsArtist = isArtist(user)
  const rolePillClass = getRolePillClass(user)
  const roleLabel = getRoleLabel(user)

  return (
    <div className="app-shell">
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
              <NavLink to="/users" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                👥 Artists
              </NavLink>
              <NavLink to="/time-logs" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                ⏱ Time Logs
              </NavLink>
              <NavLink to="/outsource" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                📤 Outsource
              </NavLink>
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
