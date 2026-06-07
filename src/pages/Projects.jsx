import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, deleteProject } from '../api'
import Modal from '../components/Modal'
import { useAuth } from '../hooks/useAuth'
import './Projects.css'

const PROJ_STATUS_COLOR = {
  Active: 'var(--accent)',
  Complete: 'var(--success)',
  Hold: 'var(--warning)',
  Archived: 'var(--text-muted)',
}

function daysLeft(deadline) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000)
  return diff
}

function getProjectMonthRange(p) {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  let startLabel = ''
  let endLabel = ''
  if (p.start_date) {
    const s = new Date(p.start_date)
    startLabel = MON[s.getMonth()]
  } else {
    startLabel = MON[now.getMonth()]
  }
  if (p.deadline) {
    const e = new Date(p.deadline)
    endLabel = MON[e.getMonth()] + (e.getFullYear() !== now.getFullYear() ? ` ${e.getFullYear()}` : '')
  } else {
    endLabel = MON[now.getMonth()]
  }
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`
}

const PROJECT_TYPES = ['roto', 'paint', 'rotopaint', 'comp', 'cg', 'full']

const TYPE_COLOR = {
  roto: '#6366f1', paint: '#f59e0b', rotopaint: '#8b5cf6',
  comp: '#38bdf8', cg: '#22c55e', full: '#ef4444',
}

const TYPE_DESC = {
  roto: 'Rotoscoping only',
  paint: 'Paint / cleanup only',
  rotopaint: 'Roto + Paint',
  comp: 'Compositing',
  cg: 'CG / Tracking',
  full: 'Full VFX pipeline',
}

const DEPT_LABEL = {
  roto: 'Roto', paint: 'Paint', tracking: 'Track', cg: 'CG', comp: 'Comp',
}

function DeptBar({ label, data, color }) {
  const { total, approved, done, wip, pending } = data
  // Build stacked bar segments as percentages
  const pct = (n) => total ? Math.round((n / total) * 100) : 0
  const approvedPct  = pct(approved)
  const donePct      = pct(done)
  const wipPct       = pct(wip)
  const pendingPct   = pct(pending)

  return (
    <div className="dept-bar-item">
      <div className="dept-bar-header">
        <span className="dept-bar-label">{label}</span>
        <span className="dept-bar-count">{approved}/{total}</span>
      </div>
      <div className="dept-bar-track">
        {approvedPct > 0 && <div className="dept-seg seg-approved" style={{ width: `${approvedPct}%` }} />}
        {donePct     > 0 && <div className="dept-seg seg-done"     style={{ width: `${donePct}%` }} />}
        {wipPct      > 0 && <div className="dept-seg seg-wip"      style={{ width: `${wipPct}%` }} />}
        {pendingPct  > 0 && <div className="dept-seg seg-pending"  style={{ width: `${pendingPct}%` }} />}
      </div>
    </div>
  )
}

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', project_type: 'full', description: '', client: '', start_date: '', deadline: '', budget: '' })
  const [saving, setSaving] = useState(false)

  const { user }  = useAuth()
  const canAdmin = ['coordinator', 'admin'].includes(user?.role)

  const load = async () => {
    try {
      setLoading(true)
      const res = await getProjects()
      setProjects(res.data)
    } catch {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createProject({
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
        start_date: form.start_date || null,
        deadline: form.deadline || null,
        client: form.client || null,
        proj_status: 'Active',
      })
      setShowCreate(false)
      setForm({ name: '', project_type: 'full', description: '', client: '', start_date: '', deadline: '', budget: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch {
      setError('Failed to delete project')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} in studio
          </p>
        </div>
        {canAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Project
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => {
            const color    = TYPE_COLOR[p.project_type]
            const monthRange = getProjectMonthRange(p)
            const depts    = p.dept_progress || {}
            const hasDepts = Object.keys(depts).length > 0
            const approvalPct = p.shot_count > 0
              ? Math.round((p.approved_shots / p.shot_count) * 100)
              : 0

            const dl = daysLeft(p.deadline)
            const dlStr = dl === null ? null : dl > 0 ? `${dl}d left` : `${Math.abs(dl)}d overdue`
            const dlCol = dl === null ? 'var(--text-muted)' : dl > 14 ? 'var(--success)' : dl > 0 ? 'var(--warning)' : 'var(--error)'
            const statusColor = PROJ_STATUS_COLOR[p.proj_status] || 'var(--text-muted)'

            return (
              <div
                key={p.id}
                className="project-card"
                style={{ '--accent': color }}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                {/* ── Accent bar ── */}
                <div className="pc-accent-bar" />

                {/* ── Card body ── */}
                <div className="pc-body">

                  {/* Row 1: type pill + status + delete */}
                  <div className="pc-top-row">
                    <span className="pc-type-pill" style={{
                      background: `${color}1a`,
                      color,
                      border: `1px solid ${color}44`,
                    }}>
                      {p.project_type.toUpperCase()}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.proj_status && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>
                          {p.proj_status}
                        </span>
                      )}
                      {canAdmin && (
                        <button
                          className="pc-delete-btn"
                          onClick={e => { e.stopPropagation(); setDeleteTarget(p) }}
                          title="Delete project"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: project name */}
                  <h3 className="pc-name">{p.name}</h3>

                  {/* Row 2b: client */}
                  {p.client && (
                    <p className="pc-desc" style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🏢 {p.client}
                      <span style={{
                        color: 'var(--accent)', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)',
                        background: 'rgba(0,212,255,0.08)', padding: '1px 6px', borderRadius: 10,
                        border: '1px solid rgba(0,212,255,0.2)'
                      }}>{monthRange}</span>
                    </p>
                  )}

                  {/* Row 3: description or pipeline hint */}
                  <p className="pc-desc">
                    {p.description || TYPE_DESC[p.project_type]}
                  </p>

                  {/* Row 4: stats grid */}
                  <div className="pc-stats-grid">
                    <div className="pc-stat">
                      <span className="pc-stat-value">{p.shot_count}</span>
                      <span className="pc-stat-label">Shots</span>
                    </div>
                    <div className="pc-stat">
                      <span className="pc-stat-value">{p.version_count ?? 0}</span>
                      <span className="pc-stat-label">Versions</span>
                    </div>
                    <div className="pc-stat">
                      <span className="pc-stat-value">{p.batch_count ?? 0}</span>
                      <span className="pc-stat-label">Batches</span>
                    </div>
                    <div className="pc-stat">
                      <span className="pc-stat-value" style={{ color: p.approved_shots > 0 ? 'var(--success)' : undefined }}>
                        {p.approved_shots ?? 0}
                      </span>
                      <span className="pc-stat-label">Approved</span>
                    </div>
                  </div>

                  {/* Row 5: overall completion bar */}
                  {p.shot_count > 0 && (
                    <div className="pc-completion">
                      <div className="pc-completion-header">
                        <span className="pc-completion-label">Overall completion</span>
                        <span className="pc-completion-pct">{approvalPct}%</span>
                      </div>
                      <div className="pc-completion-track">
                        <div
                          className="pc-completion-fill"
                          style={{ width: `${approvalPct}%`, background: color }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Row 6: per-dept progress bars */}
                  {hasDepts && (
                    <div className="pc-depts">
                      <div className="pc-depts-title">Pipeline</div>
                      <div className="pc-dept-bars">
                        {Object.entries(depts).map(([dept, data]) => (
                          <DeptBar
                              key={dept}
                              label={DEPT_LABEL[dept] || dept}
                              data={data}
                              color={color}
                            />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 6b: Admin cost breakdown bar */}
                  {canAdmin && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)',
                      gap: '4px', flexWrap: 'wrap'
                    }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In-house</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>₹{Math.round(p.inhouse_cost || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outsource</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--outsource)' }}>₹{Math.round(p.outsource_cost || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--yellow)' }}>₹{Math.round((p.inhouse_cost || 0) + (p.outsource_cost || 0)).toLocaleString('en-IN')}</div>
                      </div>
                      {p.budget > 0 && (
                        <>
                          <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                          <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget</div>
                            <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--green)' }}>₹{Math.round(p.budget).toLocaleString('en-IN')}</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Row 7: footer */}
                  <div className="pc-footer">
                    <span className="pc-date">
                      {dlStr ? (
                        <span style={{ color: dlCol, fontWeight: 700 }}>⏰ {dlStr}</span>
                      ) : (
                        <>📅 {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                    </span>
                    {p.budget > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Budget: ₹{p.budget.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="pc-open-cta" style={{ color }}>
                      Open project →
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <Modal title="New Project" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Feature Film VFX S1"
                required autoFocus
              />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Client Name</label>
              <input
                className="form-control"
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                placeholder="e.g. Netflix India"
              />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Pipeline Type *</label>
              <select
                className="form-control"
                value={form.project_type}
                onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
              >
                {PROJECT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)} — {TYPE_DESC[t]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="mt-3">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input type="date" className="form-control" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Budget (₹) — optional</label>
              <input
                type="number"
                className="form-control"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                placeholder="e.g. 500000"
                min="0"
              />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes about this project…"
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Creating…</> : 'Create Project'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <Modal title="Delete Project" onClose={() => setDeleteTarget(null)}>
          <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>?</p>
          <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>
            This will permanently remove all shots, versions, and delivery batches. This cannot be undone.
          </p>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete Project</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
