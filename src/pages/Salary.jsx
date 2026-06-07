import { useState, useEffect } from 'react'
import { getTimeLogs, getProjects } from '../api'
import { useUsers } from '../hooks/useUsers'

function msToHM(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

function exportCSV(rows) {
  const headers = ['Artist', 'Role', 'Rate (₹/hr)', 'Date', 'Shot', 'Project', 'Hours', 'Pay (₹)']
  const data = rows.map(r => [r.artist, r.role, r.rate, r.date, r.shot, r.project, r.hours.toFixed(2), Math.round(r.pay)])
  const csv = [headers, ...data].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'salary_report.csv'
  a.click()
}

export default function Salary() {
  const { users } = useUsers()
  const [projects, setProjects] = useState([])
  const [filters, setFilters] = useState({ date_from: '', date_to: '', project_id: '' })
  const [report, setReport] = useState([]) // per-artist array
  const [flatRows, setFlatRows] = useState([])
  const [calculated, setCalculated] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getProjects().then(pr => setProjects(pr.data)).catch(() => {})
  }, [])

  async function calculate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const params = {}
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      const res = await getTimeLogs(params)
      let logs = res.data

      if (filters.project_id) {
        logs = logs.filter(l => String(l.project_id) === filters.project_id)
      }

      // Group by user
      const byUser = {}
      for (const l of logs) {
        if (!byUser[l.user_id]) byUser[l.user_id] = []
        byUser[l.user_id].push(l)
      }

      const artistReports = []
      const allFlat = []
      for (const [uid, uLogs] of Object.entries(byUser)) {
        const user = users.find(u => u.id === parseInt(uid))
        if (!user) continue
        const rate = user.hourly_rate || 0
        let totalMs = 0
        const rows = uLogs.map(l => {
          const hours = l.duration_ms / 3600000
          const pay = rate * hours
          totalMs += l.duration_ms
          const row = { artist: user.username, role: user.role, rate, date: l.log_date, shot: l.shot_name, project: l.project_name, hours, pay }
          allFlat.push(row)
          return { ...l, hours, pay }
        })
        artistReports.push({ user, rate, totalMs, totalPay: rate * (totalMs / 3600000), rows })
      }
      setReport(artistReports)
      setFlatRows(allFlat)
      setCalculated(true)
    } catch {}
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Report</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>Calculate artist earnings by time period</p>
        </div>
        {calculated && flatRows.length > 0 && (
          <button className="btn btn-secondary" onClick={() => exportCSV(flatRows)}>↓ Export CSV</button>
        )}
      </div>

      {/* Filters */}
      <form onSubmit={calculate} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Project</label>
          <select className="form-control" style={{ minWidth: 160 }} value={filters.project_id} onChange={e => setFilters(f => ({ ...f, project_id: e.target.value }))}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">From</label>
          <input type="date" className="form-control" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        </div>
        <div>
          <label className="form-label">To</label>
          <input type="date" className="form-control" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '...' : '🧮 Calculate'}
        </button>
      </form>

      {!calculated && !loading && (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h3>Set filters and click Calculate</h3>
        </div>
      )}

      {loading && <div className="empty-state"><div className="spinner" /></div>}

      {calculated && !loading && report.length === 0 && (
        <div className="empty-state">
          <div>No time logs in this range.</div>
        </div>
      )}

      {calculated && !loading && report.map(({ user, rate, totalMs, totalPay, rows }) => (
        <div key={user.id} style={{ marginBottom: '1.5rem' }}>
          {/* Artist header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '10px 10px 0 0' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{user.display_name || user.username}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.role} · ₹{rate}/hr</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent)' }}>{msToHM(totalMs)} tracked</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700 }}>₹{Math.round(totalPay).toLocaleString('en-IN')} est.</div>
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '0 0 10px 10px', borderTop: 'none' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Shot', 'Project', 'Duration', 'Pay'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.log_date}</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700 }}>{r.shot_name}</td>
                    <td style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.project_name}</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: 'var(--accent)' }}>{msToHM(r.duration_ms)}</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: 'var(--warning)', fontWeight: 700 }}>₹{Math.round(r.pay).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
