import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, deleteProject, createShot, getThumbnailUploadUrl, confirmThumbnail } from '../api'
import Modal from '../components/Modal'
import { useAuth } from '../hooks/useAuth'
import { isOwner } from '../utils/permissions'
import { generateThumbnailBlob } from '../utils/thumbnail'
import { uploadToStorage } from '../utils/storage'
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


export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', project_type: 'full', description: '', client: '', start_date: '', deadline: '', budget: '' })
  const [saving, setSaving] = useState(false)
  const [folderFiles, setFolderFiles] = useState([])
  const [progressText, setProgressText] = useState('')

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

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files || [])
    const videoExtensions = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.ogg', '.m4v']
    const filtered = files.filter(file => {
      const nameLower = file.name.toLowerCase()
      const isVideoType = file.type && file.type.startsWith('video/')
      const hasVideoExt = videoExtensions.some(ext => nameLower.endsWith(ext))
      return isVideoType || hasVideoExt
    })
    setFolderFiles(filtered)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setProgressText(folderFiles.length > 0 ? 'Creating project...' : '')
    try {
      const res = await createProject({
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
        start_date: form.start_date || null,
        deadline: form.deadline || null,
        client: form.client || null,
        proj_status: 'Active',
      })

      const newProject = res.data

      if (folderFiles.length > 0) {
        for (let i = 0; i < folderFiles.length; i++) {
          const file = folderFiles[i]
          const idx = file.name.lastIndexOf('.')
          const shotName = idx === -1 ? file.name : file.name.substring(0, idx)

          setProgressText(`Creating shot ${i + 1}/${folderFiles.length}: ${shotName}...`)

          try {
            // 1. Create shot
            const shotRes = await createShot(newProject.id, {
              shot_name: shotName,
              frame_count: null,
              est_hours: 0,
              status_roto: 'Pending',
              status_paint: 'Pending',
              status_tracking: 'Pending',
              status_cg: 'Pending',
              status_comp: 'Pending',
            })
            const newShotId = shotRes.data.id

            // 2. Generate and upload thumbnail
            setProgressText(`Generating thumbnail ${i + 1}/${folderFiles.length}: ${shotName}...`)
            const blob = await generateThumbnailBlob(file)

            setProgressText(`Uploading thumbnail ${i + 1}/${folderFiles.length}: ${shotName}...`)
            const key = await uploadToStorage(blob, () => getThumbnailUploadUrl(newProject.id, newShotId))
            await confirmThumbnail(newProject.id, newShotId, key)
          } catch (shotErr) {
            console.error(`Failed to generate/upload thumbnail for shot ${shotName}:`, shotErr)
          }
        }
      }

      setShowCreate(false)
      setForm({ name: '', project_type: 'full', description: '', client: '', start_date: '', deadline: '', budget: '' })
      setFolderFiles([])
      setProgressText('')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setSaving(false)
      setProgressText('')
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
                    <div className="pc-client-row">
                      <span className="pc-client-prefix">CLIENT</span>
                      <span className="pc-client-val">{p.client}</span>
                      <span className="pc-month-tag">{monthRange}</span>
                    </div>
                  )}


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


                  {/* Row 6b: Admin cost breakdown bar */}
                  {isOwner(user) && (
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
                    {isOwner(user) && p.budget > 0 && (
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
        <Modal title="New Project" onClose={() => { if (!saving) setShowCreate(false) }}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Feature Film VFX S1"
                required autoFocus
                disabled={saving}
              />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Client Name</label>
              <input
                className="form-control"
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                placeholder="e.g. Netflix India"
                disabled={saving}
              />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Pipeline Type *</label>
              <select
                className="form-control"
                value={form.project_type}
                onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                disabled={saving}
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
                <input type="date" className="form-control" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} disabled={saving} />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input type="date" className="form-control" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} disabled={saving} />
              </div>
            </div>
            {isOwner(user) && (
              <div className="form-group mt-3">
                <label className="form-label">Budget (₹) — optional</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  placeholder="e.g. 500000"
                  min="0"
                  disabled={saving}
                />
              </div>
            )}
            
            {/* Import Shots Folder */}
            <div className="form-group mt-3">
              <label className="form-label">Import Shots Folder (Optional)</label>
              <div className="project-folder-picker" style={{ border: '2px dashed var(--border2)', borderRadius: '8px', padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                <input
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  disabled={saving}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: saving ? 'not-allowed' : 'pointer' }}
                  onChange={handleFolderChange}
                />
                <div style={{ fontSize: '20px' }}>📁</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {folderFiles.length > 0 ? 'Change selected folder' : 'Choose local project folder'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  Will auto-create shots & generate thumbnails from video files inside
                </div>
              </div>
              {folderFiles.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, marginTop: 6 }}>
                  <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                    ✓ {folderFiles.length} video shot{folderFiles.length !== 1 ? 's' : ''} detected
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setFolderFiles([])}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 11 }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="form-group mt-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes about this project…"
                disabled={saving}
              />
            </div>

            {saving && progressText && (
              <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '12px', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>Importing Directory</div>
                <div style={{ fontSize: '11px', color: 'var(--text)' }}>{progressText}</div>
                <div className="spinner" style={{ width: 14, height: 14, marginTop: 4 }} />
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
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
