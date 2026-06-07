import { useState, useEffect } from 'react'
import { getTimeLogs } from '../api'
import { useUsers } from '../hooks/useUsers'

function msToHM(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

function exportCSV(logs) {
  const headers = ['Date', 'Artist', 'Shot', 'Project', 'Duration', 'Sessions']
  const rows = logs.map(l => [
    l.log_date,
    l.username,
    l.shot_name,
    l.project_name,
    msToHM(l.duration_ms),
    l.sessions,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'time_logs.csv'
  a.click()
}

export default function TimeLogs() {
  const [logs, setLogs] = useState([])
  const { users: allUsers } = useUsers()
  const users = allUsers.filter(u => u.role === 'artist')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ user_id: '', date_from: '', date_to: '' })

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    setLoading(true)
    try {
      const params = {}
      if (filters.user_id) params.user_id = filters.user_id
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      const res = await getTimeLogs(params)
      setLogs(res.data)
    } catch {}
    setLoading(false)
  }

  function handleFilter(e) {
    e.preventDefault()
    loadLogs()
  }

  const totalMs = logs.reduce((s, l) => s + l.duration_ms, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Time Logs</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>
            {logs.length} entries · Total: {msToHM(totalMs)}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => exportCSV(logs)}>
          ↓ Export CSV
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Artist</label>
          <select
            className="form-control"
            style={{ minWidth: 160 }}
            value={filters.user_id}
            onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
          >
            <option value="">All Artists</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">From</label>
          <input type="date" className="form-control" value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        </div>
        <div>
          <label className="form-label">To</label>
          <input type="date" className="form-control" value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <button type="button" className="btn btn-secondary" onClick={() => {
          setFilters({ user_id: '', date_from: '', date_to: '' })
          setTimeout(loadLogs, 50)
        }}>Clear</button>
      </form>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⏱</div>
          <h3>No time logs found</h3>
          <p>Artists log time via the Artist Portal.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Artist', 'Shot', 'Project', 'Duration', 'Sessions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.log_date}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 700 }}>{l.username}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700 }}>{l.shot_name || '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.project_name || '—'}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--success)', fontWeight: 700 }}>{msToHM(l.duration_ms)}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{l.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
