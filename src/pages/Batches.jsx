import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject, getShots, getBatches, createBatch, updateBatch, deleteBatch } from '../api'
import Modal from '../components/Modal'
import { useAuth } from '../hooks/useAuth'
import './Batches.css'

const EMPTY_FORM = {
  batch_number: '', delivery_date: '', folder_link: '', notes: '', shot_ids: [],
}

export default function Batches() {
  const { projectId } = useParams()
  const [project, setProject]   = useState(null)
  const [batches, setBatches]   = useState([])
  const [shots, setShots]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editBatch, setEditBatch]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)

  const { user } = useAuth()
  const canAdmin = ['coordinator', 'admin'].includes(user?.role)

  const load = async () => {
    try {
      setLoading(true)
      const [pRes, sRes, bRes] = await Promise.all([
        getProject(projectId),
        getShots(projectId),
        getBatches(projectId),
      ])
      setProject(pRes.data)
      setShots(sRes.data)
      setBatches(bRes.data)
    } catch {
      setError('Failed to load batch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, batch_number: `BATCH_${String(batches.length + 1).padStart(2, '0')}` })
    setEditBatch(null)
    setShowModal(true)
  }

  const openEdit = (b) => {
    setForm({
      batch_number:  b.batch_number,
      delivery_date: b.delivery_date || '',
      folder_link:   b.folder_link || '',
      notes:         b.notes || '',
      shot_ids:      b.shot_ids || [],
    })
    setEditBatch(b)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, delivery_date: form.delivery_date || null }
      if (editBatch) {
        await updateBatch(projectId, editBatch.id, payload)
      } else {
        await createBatch(projectId, payload)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save batch')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBatch(projectId, deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch {
      setError('Failed to delete batch')
    }
  }

  const toggleShot = (shotId) => {
    setForm(f => ({
      ...f,
      shot_ids: f.shot_ids.includes(shotId)
        ? f.shot_ids.filter(id => id !== shotId)
        : [...f.shot_ids, shotId],
    }))
  }

  const shotMap = Object.fromEntries(shots.map(s => [s.id, s]))

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }} /></div>

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="bc-sep">›</span>
        <Link to={`/projects/${projectId}`}>{project?.name}</Link>
        <span className="bc-sep">›</span>
        <span>Batches</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Batches</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>
            {batches.length} batch{batches.length !== 1 ? 'es' : ''} for {project?.name}
          </p>
        </div>
        {canAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>+ New Batch</button>
        )}
      </div>

      {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}

      {batches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No batches yet</h3>
          <p>Group shots into delivery batches to track what was sent to the client.</p>
        </div>
      ) : (
        <div className="batches-list">
          {batches.map(b => (
            <div key={b.id} className="batch-card">
              <div className="batch-header">
                <div className="batch-number">{b.batch_number}</div>
                <div className="batch-meta">
                  {b.delivery_date && <span>📅 {b.delivery_date}</span>}
                  <span>{b.shot_ids?.length || 0} shots</span>
                  {b.folder_link && (
                    <a href={b.folder_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">📁 Folder</a>
                  )}
                </div>
                {canAdmin && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>✏ Edit</button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(b)} title="Delete">🗑</button>
                  </div>
                )}
              </div>

              {b.notes && <div className="batch-notes">{b.notes}</div>}

              {b.shot_ids?.length > 0 && (
                <div className="batch-shots">
                  {b.shot_ids.map(sid => (
                    <span key={sid} className="batch-shot-chip">
                      {shotMap[sid]?.shot_name || `Shot #${sid}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editBatch ? `Edit ${editBatch.batch_number}` : 'New Delivery Batch'}
          onClose={() => setShowModal(false)}
          size="modal-lg"
        >
          <form onSubmit={handleSave}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Batch Number *</label>
                <input className="form-control" value={form.batch_number}
                  onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))}
                  placeholder="e.g. BATCH_01" required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Date</label>
                <input className="form-control" type="date" value={form.delivery_date}
                  onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Folder Link</label>
                <input className="form-control" value={form.folder_link}
                  onChange={e => setForm(f => ({ ...f, folder_link: e.target.value }))}
                  placeholder="https://drive.google.com/…" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes about this delivery…" />
              </div>
            </div>

            <div className="divider" />
            <div className="form-label" style={{ marginBottom: 10 }}>
              Select Shots ({form.shot_ids.length} selected)
            </div>
            <div className="shot-picker">
              {shots.map(s => (
                <label key={s.id} className={`shot-pick-item ${form.shot_ids.includes(s.id) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.shot_ids.includes(s.id)}
                    onChange={() => toggleShot(s.id)}
                    style={{ display: 'none' }}
                  />
                  <span className="text-mono" style={{ fontSize: '0.8rem' }}>{s.shot_name}</span>
                  {s.sequence && <span className="text-dim" style={{ fontSize: '0.7rem' }}>{s.sequence}</span>}
                </label>
              ))}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : editBatch ? 'Save Changes' : 'Create Batch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Batch" onClose={() => setDeleteTarget(null)}>
          <p>Delete <strong>{deleteTarget.batch_number}</strong>? Shot data will not be affected.</p>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete Batch</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
