import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, createUser, updateUser, deleteUser } from '../api'
import Modal from '../components/Modal'
import { RoleBadge } from '../components/StatusBadge'
import './Users.css'

const ROLES = ['artist', 'coordinator', 'admin']

const EMPTY_FORM = { username: '', password: '', email: '', role: 'artist', hourly_rate: '', display_name: '' }

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [editUser, setEditUser]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [editForm, setEditForm]         = useState({ role: 'artist', email: '', is_active: true, password: '', hourly_rate: '', display_name: '' })
  const [saving, setSaving]             = useState(false)

  const me = JSON.parse(localStorage.getItem('user') || '{}')

  const load = async () => {
    try {
      const res = await getUsers()
      setUsers(res.data)
    } catch (err) {
      if (err.response?.status === 403) {
        navigate('/')
      }
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createUser({
        ...form,
        hourly_rate: form.hourly_rate !== '' ? parseFloat(form.hourly_rate) : 0,
        display_name: form.display_name || null,
      })
      setShowCreate(false)
      setForm(EMPTY_FORM)
      setSuccess('User created successfully.')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (u) => {
    setEditForm({ role: u.role, email: u.email || '', is_active: u.is_active, password: '', hourly_rate: u.hourly_rate ?? '', display_name: u.display_name || '' })
    setEditUser(u)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        role: editForm.role,
        email: editForm.email || null,
        is_active: editForm.is_active,
        hourly_rate: editForm.hourly_rate !== '' ? parseFloat(editForm.hourly_rate) : null,
        display_name: editForm.display_name || null,
      }
      if (editForm.password) payload.password = editForm.password
      await updateUser(editUser.id, payload)
      setEditUser(null)
      setSuccess('User updated.')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      setSuccess('User deleted.')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }} /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>
            {users.length} account{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true) }}>
          + New User
        </button>
      </div>

      {error   && <div className="alert alert-error"   onClick={() => setError('')}>{error}</div>}
      {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Role</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar-sm">{u.username[0].toUpperCase()}</div>
                      <span style={{ fontWeight: 600 }}>{u.username}</span>
                      {u.id === me.id && <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>You</span>}
                    </div>
                  </td>
                  <td className="text-muted">{u.display_name || '—'}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--success)', fontSize: '0.85rem' }}>
                    {u.hourly_rate > 0 ? `₹${u.hourly_rate}/hr` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-changes'}`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="row-actions" style={{ opacity: 1 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏ Edit</button>
                      {u.id !== me.id && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(u)}>🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <Modal title="Create New User" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-control" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="e.g. john_roto" required autoFocus />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Password *</label>
              <input className="form-control" type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Set initial password" required />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@nityavfx.com" />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <div className="role-hint">
                <span><strong>Artist</strong> — Can edit only their assigned shots</span>
                <span><strong>Coordinator</strong> — Full project access, manage shots and artists</span>
                <span><strong>Admin</strong> — Full access including user management</span>
              </div>
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Display Name</label>
              <input className="form-control" value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Ravi Kumar" />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Hourly Rate (₹/hr)</label>
              <input type="number" className="form-control" value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                placeholder="e.g. 350" min="0" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Creating…</> : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.username}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@nityavfx.com" />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Role</label>
              <select className="form-control" value={editForm.role}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Account Status</label>
              <select className="form-control" value={editForm.is_active ? 'active' : 'inactive'}
                onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value === 'active' }))}>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Display Name</label>
              <input className="form-control" value={editForm.display_name}
                onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Ravi Kumar" />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Hourly Rate (₹/hr)</label>
              <input type="number" className="form-control" value={editForm.hourly_rate}
                onChange={e => setEditForm(f => ({ ...f, hourly_rate: e.target.value }))}
                placeholder="e.g. 350" min="0" />
            </div>
            <div className="form-group mt-3">
              <label className="form-label">New Password <span className="text-dim">(leave blank to keep current)</span></label>
              <input className="form-control" type="password" value={editForm.password}
                onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter new password…" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <p>Delete <strong>{deleteTarget.username}</strong>? This cannot be undone.</p>
          <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>
            Their assigned shots will remain but the account will no longer be able to log in.
          </p>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete User</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
