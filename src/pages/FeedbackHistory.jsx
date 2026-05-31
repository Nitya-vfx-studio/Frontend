import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProject, getProjectFeedback } from '../api'
import { FeedbackBadge, TaskBadge } from '../components/StatusBadge'
import './FeedbackHistory.css'

const FEEDBACK_FILTERS = ['All', 'Pending', 'Approved', 'Changes Required', 'No Feedback']

export default function FeedbackHistory() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject]   = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, fRes] = await Promise.all([
          getProject(projectId),
          getProjectFeedback(projectId),
        ])
        setProject(pRes.data)
        setHistory(fRes.data)
      } catch {
        setError('Failed to load feedback history')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  const filtered = history.filter(item => {
    const matchFilter = filter === 'All' || item.feedback_status === filter
    const matchSearch =
      item.shot_name.toLowerCase().includes(search.toLowerCase()) ||
      item.version_number.toLowerCase().includes(search.toLowerCase()) ||
      (item.artist_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.feedback_detail || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  // Summary counts
  const counts = history.reduce((acc, item) => {
    acc[item.feedback_status] = (acc[item.feedback_status] || 0) + 1
    return acc
  }, {})

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }} /></div>

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="bc-sep">›</span>
        <Link to={`/projects/${projectId}`}>{project?.name}</Link>
        <span className="bc-sep">›</span>
        <span>Feedback History</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Feedback History</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>{project?.name}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary row */}
      <div className="feedback-summary">
        {[
          { label: 'Total', count: history.length, cls: 'badge-pending' },
          { label: 'Approved', count: counts['Approved'] || 0, cls: 'badge-approved' },
          { label: 'Changes Required', count: counts['Changes Required'] || 0, cls: 'badge-changes' },
          { label: 'Pending', count: counts['Pending'] || 0, cls: 'badge-wip' },
          { label: 'No Feedback', count: counts['No Feedback'] || 0, cls: 'badge-na' },
        ].map(s => (
          <div key={s.label} className="feedback-summary-item">
            <div className="summary-count">{s.count}</div>
            <div className={`badge ${s.cls}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="shots-toolbar" style={{ marginBottom: 16 }}>
        <input
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Search shots, feedback…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {FEEDBACK_FILTERS.map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-dim" style={{ fontSize: '0.8rem' }}>
          {filtered.length} of {history.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No feedback records</h3>
          <p>{search || filter !== 'All' ? 'Try adjusting your filters.' : 'Feedback will appear here as versions are reviewed by the client.'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Shot</th>
                  <th>Version</th>
                  <th>Artist</th>
                  <th>Sent</th>
                  <th>Feedback Status</th>
                  <th>Feedback Date</th>
                  <th>Task Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <button
                        className="shot-name-link"
                        onClick={() => navigate(`/projects/${projectId}/shots/${item.shot_id}`)}
                      >
                        {item.shot_name}
                      </button>
                    </td>
                    <td><span className="text-mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{item.version_number}</span></td>
                    <td className="text-muted">{item.artist_name || '—'}</td>
                    <td className="text-muted">{item.date_sent || '—'}</td>
                    <td><FeedbackBadge status={item.feedback_status} /></td>
                    <td className="text-muted">{item.feedback_date || '—'}</td>
                    <td><TaskBadge status={item.task_status} /></td>
                    <td className="feedback-notes-cell">
                      {item.feedback_detail && (
                        <span title={item.feedback_detail}>{item.feedback_detail.slice(0, 60)}{item.feedback_detail.length > 60 ? '…' : ''}</span>
                      )}
                      {item.action_required && (
                        <span className="action-chip" title={item.action_required}>⚠ {item.action_required.slice(0, 40)}{item.action_required.length > 40 ? '…' : ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
