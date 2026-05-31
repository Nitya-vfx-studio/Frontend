import { useState, useEffect } from 'react'
import { getOutsource, createOutsource, updateOutsource, deleteOutsource, getProjects, getShots } from '../api'

const STATUS_OPTIONS = ['Pending', 'Delivered', 'Revision', 'Cancelled']
const STATUS_CLASS = { Pending: 'badge-warning', Delivered: 'badge-success', Revision: 'badge-danger', Cancelled: 'badge-secondary' }

export default function Outsource() {
  const [entries, setEntries] = useState([])
  const [projects, setProjects] = useState([])
  const [allShots, setAllShots] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('')
  const [form, setForm] = useState({ shot_id: '', vendor: '', cost: '', delivery_date: '', status: 'Pending' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [projRes, entRes] = await Promise.all([getProjects(), getOutsource({})])
      setProjects(projRes.data)
      setEntries(entRes.data)
      // Load shots for the dropdown
      const shots = []
      for (const p of projRes.data) {
        try {
          const { data } = await getShots(p.id)
          shots.push(...data.map(s => ({ ...s, project_name: p.name })))
        } catch {}
      }
      setAllShots(shots)
    } catch {}
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.shot_id || !form.vendor) return
    setSaving(true)
    try {
      await createOutsource({
        shot_id: parseInt(form.shot_id),
        vendor: form.vendor,
        cost: parseFloat(form.cost) || 0,
        delivery_date: form.delivery_date || null,
        status: form.status,
      })
      setForm({ shot_id: '', vendor: '', cost: '', delivery_date: '', status: 'Pending' })
      setMsg('Outsource entry added!')
      setTimeout(() => setMsg(''), 3000)
      await loadData()
    } catch {}
    setSaving(false)
  }

  async function handleStatusChange(id, status) {
    try {
      await updateOutsource(id, { status })
      setEntries(e => e.map(x => x.id === id ? { ...x, status } : x))
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Delete this outsource entry?')) return
    try {
      await deleteOutsource(id)
      await loadData()
    } catch {}
  }

  const filtered = entries.filter(e => !filterProject || String(e.project_id) === filterProject)
  const totalCost = filtered.reduce((s, e) => s + (e.cost || 0), 0)
  const pendingCost = filtered.filter(e => e.status === 'Pending').reduce((s, e) => s + (e.cost || 0), 0)
  const deliveredCost = filtered.filter(e => e.status === 'Delivered').reduce((s, e) => s + (e.cost || 0), 0)

  const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outsource</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>Manage outsourced shots and vendor costs</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { lbl: 'Total Cost', val: fmt(totalCost), col: 'var(--warning)' },
          { lbl: 'Pending', val: fmt(pendingCost), col: 'var(--warning)' },
          { lbl: 'Delivered', val: fmt(deliveredCost), col: 'var(--success)' },
          { lbl: 'Entries', val: filtered.length, col: 'var(--accent)' },
        ].map(s => (
          <div key={s.lbl} className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.lbl}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.col, fontFamily: 'monospace' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem' }}>Add / Update Outsource Entry</div>
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Shot</label>
            <select className="form-control" value={form.shot_id} onChange={e => setForm(f => ({ ...f, shot_id: e.target.value }))} required>
              <option value="">— select shot —</option>
              {allShots.map(s => <option key={s.id} value={s.id}>{s.shot_name} ({s.project_name})</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Vendor / Studio</label>
            <input className="form-control" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. VFX House Mumbai" required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Cost (₹)</label>
            <input type="number" className="form-control" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="e.g. 25000" min="0" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Delivery Date</label>
            <input type="date" className="form-control" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-end' }}>
            {saving ? '...' : '+ Add'}
          </button>
        </form>
        {msg && <div style={{ marginTop: 8, color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem' }}>✓ {msg}</div>}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select className="form-control" style={{ maxWidth: 200 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📤</div>
          <h3>No outsource entries</h3>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Shot', 'Project', 'Vendor', 'Cost (₹)', 'Delivery', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(245,158,11,0.02)' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700 }}>{e.shot_name}</td>
                  <td style={{ padding: '10px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.project_name}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>{e.vendor}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--warning)', fontWeight: 700 }}>₹{e.cost?.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.delivery_date || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`badge ${STATUS_CLASS[e.status] || 'badge-secondary'}`}>{e.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        className="form-control"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', minWidth: 120 }}
                        value={e.status}
                        onChange={ev => handleStatusChange(e.id, ev.target.value)}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
