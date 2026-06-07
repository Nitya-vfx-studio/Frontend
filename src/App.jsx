import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from './contexts/AuthContext'
import { useContext, lazy, Suspense } from 'react'
import Login from './pages/Login'
import Layout from './components/Layout'

// Route components are split into their own chunks and loaded on demand.
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const ShotDetail = lazy(() => import('./pages/ShotDetail'))
const Batches = lazy(() => import('./pages/Batches'))
const FeedbackHistory = lazy(() => import('./pages/FeedbackHistory'))
const ArtistPortal = lazy(() => import('./pages/ArtistPortal'))
const TimeLogs = lazy(() => import('./pages/TimeLogs'))
const Outsource = lazy(() => import('./pages/Outsource'))
const Salary = lazy(() => import('./pages/Salary'))
const Payments = lazy(() => import('./pages/Payments'))
const Invoices = lazy(() => import('./pages/Invoices'))
const Users = lazy(() => import('./pages/Users'))

function FullPageSpinner() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
}

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useContext(AuthContext)

  if (isLoading) {
    return <FullPageSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function RequireAdmin({ children }) {
  const { user, isLoading } = useContext(AuthContext)

  if (isLoading) {
    return <FullPageSpinner />
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageSpinner />}>
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
              <Route path="users" element={<RequireAdmin><Users /></RequireAdmin>} />
              <Route path="artist" element={<ArtistPortal />} />
              <Route path="time-logs" element={<TimeLogs />} />
              <Route path="outsource" element={<Outsource />} />
              <Route path="salary" element={<RequireAdmin><Salary /></RequireAdmin>} />
              <Route path="payments" element={<RequireAdmin><Payments /></RequireAdmin>} />
              <Route path="invoices" element={<RequireAdmin><Invoices /></RequireAdmin>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
