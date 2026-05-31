import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from './contexts/AuthContext'
import { useContext } from 'react'
import Login from './pages/Login'
import Layout from './components/Layout'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import ShotDetail from './pages/ShotDetail'
import Batches from './pages/Batches'
import FeedbackHistory from './pages/FeedbackHistory'
import ArtistPortal from './pages/ArtistPortal'
import TimeLogs from './pages/TimeLogs'
import Outsource from './pages/Outsource'
import Salary from './pages/Salary'
import Payments from './pages/Payments'
import Invoices from './pages/Invoices'
import Users from './pages/Users'

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useContext(AuthContext)
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetail />} />
            <Route path="projects/:projectId/shots/:shotId" element={<ShotDetail />} />
            <Route path="projects/:projectId/batches" element={<Batches />} />
            <Route path="projects/:projectId/feedback" element={<FeedbackHistory />} />
            <Route path="users" element={<Users />} />
            <Route path="artist" element={<ArtistPortal />} />
            <Route path="time-logs" element={<TimeLogs />} />
            <Route path="outsource" element={<Outsource />} />
            <Route path="salary" element={<Salary />} />
            <Route path="payments" element={<Payments />} />
            <Route path="invoices" element={<Invoices />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
