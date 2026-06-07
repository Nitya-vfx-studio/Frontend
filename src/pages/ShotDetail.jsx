import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getProject, getShot, updateShot,
  getVersions, createVersion, updateVersion, deleteVersion,
} from '../api'
import Modal from '../components/Modal'
import { DeptBadge, FeedbackBadge, TaskBadge, PipelineTracker } from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import './ShotDetail.css'

const DEPT_STATUSES   = ['Pending', 'WIP', 'Done', 'Approved', 'N/A']
const FEEDBACK_STATUS = ['Pending', 'Approved', 'Changes Required', 'No Feedback']
const TASK_STATUS     = ['Pending', 'WIP', 'Resolved', 'Approved', 'Changes Req.']

const EMPTY_VERSION = {
  version_number: '', date_sent: '', artist_name: '',
  batch_reference: '', delivery_notes: '',
}

const EMPTY_FEEDBACK = {
  feedback_status: 'Pending', feedback_date: '', feedback_detail: '',
  action_required: '', task_status: 'Pending', feedback_image: '',
}

export default function ShotDetail() {
  const { projectId, shotId } = useParams()
  const navigate = useNavigate()

  const [project, setProject]   = useState(null)
  const [shot, setShot]         = useState(null)
  const [versions, setVersions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  // Edit shot statuses
  const [editingStatus, setEditingStatus] = useState(false)
  const [statusForm, setStatusForm]       = useState({})
  const [savingStatus, setSavingStatus]   = useState(false)

  // Version modal
  const [showAddVersion, setShowAddVersion] = useState(false)
  const [versionForm, setVersionForm]       = useState(EMPTY_VERSION)
  const [savingVersion, setSavingVersion]   = useState(false)

  // Feedback modal
  const [feedbackVersion, setFeedbackVersion] = useState(null)
  const [feedbackForm, setFeedbackForm]       = useState(EMPTY_FEEDBACK)
  const [savingFeedback, setSavingFeedback]   = useState(false)

  // Delete version
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { user }  = useAuth()
  const canAdmin = ['coordinator', 'admin'].includes(user?.role)
  const canEdit  = canAdmin || (shot && shot.assigned_artist === user?.username)

  const load = async () => {
    try {
      setLoading(true)
      const [pRes, sRes, vRes] = await Promise.all([
        getProject(projectId),
        getShot(projectId, shotId),
        getVersions(projectId, shotId),
      ])
      setProject(pRes.data)
      setShot(sRes.data)
      setVersions(vRes.data)
    } catch {
      setError('Failed to load shot data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId, shotId])

  // ── Status editing ──────────────────────────────────────────────────────
  const openStatusEdit = () => {
    setStatusForm({
      status_roto:     shot.status_roto,
      status_paint:    shot.status_paint,
      status_tracking: shot.status_tracking,
      status_cg:       shot.status_cg,
      status_comp:     shot.status_comp,
    })
    setEditingStatus(true)
  }

  const saveStatus = async () => {
    setSavingStatus(true)
    try {
      await updateShot(projectId, shotId, statusForm)
      setEditingStatus(false)
      load()
    } catch {
      setError('Failed to update statuses')
    } finally {
      setSavingStatus(false)
    }
  }

  // ── Version submission ──────────────────────────────────────────────────
  const handleAddVersion = async (e) => {
    e.preventDefault()
    setSavingVersion(true)
    try {
      await createVersion(projectId, shotId, {
        ...versionForm,
        date_sent: versionForm.date_sent || null,
        artist_name: versionForm.artist_name || user?.username,
      })
      setShowAddVersion(false)
      setVersionForm(EMPTY_VERSION)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit version')
    } finally {
      setSavingVersion(false)
    }
  }

  // ── Feedback editing ─────────────────────────────────────────────────────
  const openFeedback = (v) => {
    setFeedbackForm({
      feedback_status: v.feedback_status,
      feedback_date:   v.feedback_date || '',
      feedback_detail: v.feedback_detail || '',
      action_required: v.action_required || '',
      task_status:     v.task_status,
      feedback_image:  v.feedback_image || '',
    })
    setFeedbackVersion(v)
  }

  const saveFeedback = async (e) => {
    e.preventDefault()
    setSavingFeedback(true)
    try {
      await updateVersion(projectId, shotId, feedbackVersion.id, {
        ...feedbackForm,
        feedback_date: feedbackForm.feedback_date || null,
      })
      setFeedbackVersion(null)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save feedback')
    } finally {
      setSavingFeedback(false)
    }
  }

  // ── Delete version ───────────────────────────────────────────────────────
  const handleDeleteVersion = async () => {
    try {
      await deleteVersion(projectId, shotId, deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch {
      setError('Failed to delete version')
    }
  }

  // ── Auto-generate next version number ───────────────────────────────────
  const nextVersionNumber = () => {
    if (!versions.length) return 'v01'
    const nums = versions
      .map(v => parseInt(v.version_number.replace(/\D/g, '') || '0'))
      .filter(n => !isNaN(n))
    const next = Math.max(...nums, 0) + 1
    return `v${String(next).padStart(2, '0')}`
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
  if (!shot) return <div className="empty-state"><p>Shot not found.</p></div>

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="bc-sep">›</span>
        <Link to={`/projects/${projectId}`}>{project?.name}</Link>
        <span className="bc-sep">›</span>
        <span className="text-mono">{shot.shot_name}</span>
      </div>

      {/* Shot header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-mono">{shot.shot_name}</h1>
          <div className="shot-meta-row">
            {shot.sequence && <span className="text-muted">{shot.sequence}</span>}
            {shot.frame_count && <span className="text-muted">• {shot.frame_count} frames</span>}
            {shot.assigned_artist && <span className="text-muted">• 👤 {shot.assigned_artist}</span>}
          </div>
        </div>
        <div className="page-actions">
          {shot.folder_link && (
            <a href={shot.folder_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">📁 Folder</a>
          )}
          {shot.preview_link && (
            <a href={shot.preview_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">▶ Preview</a>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { setVersionForm({ ...EMPTY_VERSION, version_number: nextVersionNumber() }); setShowAddVersion(true) }}>
              + Submit Version
            </button>
          )}
        </div>
      </div>

      {error   && <div className="alert alert-error"   onClick={() => setError('')}>{error}</div>}
      {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

      {/* Pipeline status card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>Pipeline Status</h3>
          {canEdit && !editingStatus && (
            <button className="btn btn-secondary btn-sm" onClick={openStatusEdit}>✏ Edit Statuses</button>
          )}
          {editingStatus && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingStatus(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveStatus} disabled={savingStatus}>
                {savingStatus ? <><span className="spinner" /> Saving…</> : 'Save'}
              </button>
            </div>
          )}
        </div>

        {editingStatus ? (
          <div className="status-edit-grid">
            {[
              { key: 'status_roto', label: 'Roto' },
              { key: 'status_paint', label: 'Paint' },
              { key: 'status_tracking', label: 'Tracking' },
              { key: 'status_cg', label: 'CG' },
              { key: 'status_comp', label: 'Comp' },
            ].map(({ key, label }) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <select className="form-control" value={statusForm[key]}
                  onChange={e => setStatusForm(f => ({ ...f, [key]: e.target.value }))}>
                  {DEPT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        ) : (
          <div className="pipeline-display">
            {[
              { label: 'Roto',     val: shot.status_roto },
              { label: 'Paint',    val: shot.status_paint },
              { label: 'Tracking', val: shot.status_tracking },
              { label: 'CG',       val: shot.status_cg },
              { label: 'Comp',     val: shot.status_comp },
            ].map(({ label, val }) => (
              <div key={label} className="pipeline-dept">
                <div className="pipeline-dept-label">{label}</div>
                <DeptBadge status={val} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Versions */}
      <div className="card">
        <div className="card-header">
          <h3>Version History <span className="text-dim">({versions.length})</span></h3>
        </div>

        {versions.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-icon">📭</div>
            <h3>No versions yet</h3>
            <p>Submit the first version when work is ready for client review.</p>
          </div>
        ) : (
          <div className="versions-list">
            {versions.map(v => (
              <div key={v.id} className="version-item">
                <div className="version-header">
                  <div className="version-tag">{v.version_number}</div>
                  <div className="version-meta">
                    {v.date_sent && <span>Sent {v.date_sent}</span>}
                    {v.artist_name && <span>by {v.artist_name}</span>}
                    {v.batch_reference && <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>{v.batch_reference}</span>}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <FeedbackBadge status={v.feedback_status} />
                    <TaskBadge status={v.task_status} />
                    {canEdit && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => openFeedback(v)}>Update Feedback</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(v)} title="Delete">🗑</button>
                      </>
                    )}
                  </div>
                </div>

                {(v.delivery_notes || v.feedback_detail || v.action_required) && (
                  <div className="version-body">
                    {v.delivery_notes && (
                      <div className="version-note">
                        <span className="note-label">Delivery notes:</span> {v.delivery_notes}
                      </div>
                    )}
                    {v.feedback_detail && (
                      <div className="version-note feedback-note">
                        <span className="note-label">Client feedback:</span> {v.feedback_detail}
                        {v.feedback_date && <span className="text-dim"> ({v.feedback_date})</span>}
                      </div>
                    )}
                    {v.action_required && (
                      <div className="version-note action-note">
                        <span className="note-label">Action required:</span> {v.action_required}
                      </div>
                    )}
                    {v.feedback_image && (
                      <div className="version-note">
                        <a href={v.feedback_image} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">🖼 View Feedback Image</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Submit Version Modal ─────────────────────────────────────────── */}
      {showAddVersion && (
        <Modal title="Submit Version" onClose={() => setShowAddVersion(false)}>
          <form onSubmit={handleAddVersion}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Version Number *</label>
                <input className="form-control" value={versionForm.version_number}
                  onChange={e => setVersionForm(f => ({ ...f, version_number: e.target.value }))}
                  placeholder="v01" required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Date Sent</label>
                <input className="form-control" type="date" value={versionForm.date_sent}
                  onChange={e => setVersionForm(f => ({ ...f, date_sent: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Artist Name</label>
                <input className="form-control" value={versionForm.artist_name}
                  onChange={e => setVersionForm(f => ({ ...f, artist_name: e.target.value }))}
                  placeholder={user?.username} />
              </div>
              <div className="form-group">
                <label className="form-label">Batch Reference</label>
                <input className="form-control" value={versionForm.batch_reference}
                  onChange={e => setVersionForm(f => ({ ...f, batch_reference: e.target.value }))}
                  placeholder="e.g. BATCH_01" />
              </div>
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Delivery Notes</label>
              <textarea className="form-control" rows={3} value={versionForm.delivery_notes}
                onChange={e => setVersionForm(f => ({ ...f, delivery_notes: e.target.value }))}
                placeholder="Notes for the client about this version…" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddVersion(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingVersion}>
                {savingVersion ? <><span className="spinner" /> Submitting…</> : 'Submit Version'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Feedback Modal ───────────────────────────────────────────────── */}
      {feedbackVersion && (
        <Modal title={`Feedback — ${feedbackVersion.version_number}`} onClose={() => setFeedbackVersion(null)} size="modal-lg">
          <form onSubmit={saveFeedback}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Feedback Status</label>
                <select className="form-control" value={feedbackForm.feedback_status}
                  onChange={e => setFeedbackForm(f => ({ ...f, feedback_status: e.target.value }))}>
                  {FEEDBACK_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Feedback Date</label>
                <input className="form-control" type="date" value={feedbackForm.feedback_date}
                  onChange={e => setFeedbackForm(f => ({ ...f, feedback_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Task Status</label>
                <select className="form-control" value={feedbackForm.task_status}
                  onChange={e => setFeedbackForm(f => ({ ...f, task_status: e.target.value }))}>
                  {TASK_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Feedback Image URL</label>
                <input className="form-control" value={feedbackForm.feedback_image}
                  onChange={e => setFeedbackForm(f => ({ ...f, feedback_image: e.target.value }))}
                  placeholder="https://…" />
              </div>
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Feedback Detail</label>
              <textarea className="form-control" rows={3} value={feedbackForm.feedback_detail}
                onChange={e => setFeedbackForm(f => ({ ...f, feedback_detail: e.target.value }))}
                placeholder="Client's feedback notes…" />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Action Required</label>
              <textarea className="form-control" rows={2} value={feedbackForm.action_required}
                onChange={e => setFeedbackForm(f => ({ ...f, action_required: e.target.value }))}
                placeholder="What needs to be fixed or changed…" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setFeedbackVersion(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingFeedback}>
                {savingFeedback ? <><span className="spinner" /> Saving…</> : 'Save Feedback'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete version confirm */}
      {deleteTarget && (
        <Modal title="Delete Version" onClose={() => setDeleteTarget(null)}>
          <p>Delete <strong>{deleteTarget.version_number}</strong>? All feedback for this version will be lost.</p>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteVersion}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
