import Modal from '../Modal'
import { ArtistSelectDropdown, StatusSelectDropdown, TaskSelectDropdown, TASK_OPTIONS } from '../dropdowns'

export function AddEditShotModal({ show, editShot, form, setForm, saving, shotFileObj, setShotFileObj, users, onSave, onClose }) {
  if (!show && !editShot) return null

  return (
    <Modal
      title={editShot ? `Edit ${editShot.shot_name}` : 'Add Shot'}
      onClose={onClose}
      size="modal-lg"
    >
      <form onSubmit={onSave}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Shot Name *</label>
            <input className="form-control" value={form.shot_name}
              onChange={e => setForm(f => ({ ...f, shot_name: e.target.value }))}
              placeholder="e.g. SH_0010" required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Frame Count</label>
            <input className="form-control" type="number" value={form.frame_count}
              onChange={e => setForm(f => ({ ...f, frame_count: e.target.value }))}
              placeholder="e.g. 120" />
          </div>

          <div className="form-group">
            <label className="form-label">Task</label>
            <TaskSelectDropdown
              value={TASK_OPTIONS.includes(form.task_name) ? form.task_name : (form.task_name ? 'Other' : '')}
              onChange={val => setForm(f => ({ ...f, task_name: val === 'Other' ? '' : val }))}
            />
            {(!TASK_OPTIONS.filter(t => t !== 'Other').includes(form.task_name)) && (
              <input className="form-control" style={{ marginTop: 6 }} value={form.task_name}
                onChange={e => setForm(f => ({ ...f, task_name: e.target.value }))}
                placeholder="Custom task name…" />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Hours</label>
            <input className="form-control" type="number" step="0.5" value={form.est_hours}
              onChange={e => setForm(f => ({ ...f, est_hours: e.target.value }))}
              placeholder="e.g. 8" />
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Artist</label>
            <ArtistSelectDropdown
              selectedArtists={form.assigned_artist ? form.assigned_artist.split(',').map(a => a.trim()).filter(Boolean) : []}
              users={users}
              onChange={val => setForm(f => ({ ...f, assigned_artist: val }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assignment Type</label>
            <StatusSelectDropdown
              value={form.outsourced ? 'Outsourced' : 'In-house'}
              onChange={val => setForm(f => ({ ...f, outsourced: val === 'Outsourced' }))}
              options={[
                { label: '🏠 In-house', value: 'In-house' },
                { label: '📤 Outsourced', value: 'Outsourced' },
              ]}
            />
          </div>

          {form.outsourced && (
            <>
              <div className="form-group">
                <label className="form-label">Vendor Name *</label>
                <input className="form-control" value={form.vendor || ''}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                  placeholder="e.g. VFX Vendor" required />
              </div>
              <div className="form-group">
                <label className="form-label">Outsource Cost (₹) *</label>
                <input className="form-control" type="number" value={form.cost || ''}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  placeholder="e.g. 15000" min="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Date</label>
                <input className="form-control" type="date" value={form.delivery_date || ''}
                  onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
              </div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)', background: 'var(--surface)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Shot Path</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-control" style={{ flex: 1 }} value={form.shot_path}
                  onChange={e => setForm(f => ({ ...f, shot_path: e.target.value }))}
                  placeholder="/Volumes/Projects/SH_0010.mov" />
                <label className="btn btn-secondary" style={{ whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  📁 Browse
                  <input type="file" accept="video/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) { setShotFileObj(file); setForm(f => ({ ...f, shot_path: file.name })) }
                    }} />
                </label>
              </div>
              {shotFileObj && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>✓</span><span>{shotFileObj.name}</span>
                  <span style={{ color: 'var(--muted)' }}>({(shotFileObj.size / 1024 / 1024).toFixed(1)} MB)</span>
                  <button type="button" onClick={() => { setShotFileObj(null); setForm(f => ({ ...f, shot_path: '' })) }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, marginLeft: 2 }}>✕</button>
                </div>
              )}
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                Google Drive <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)', fontSize: 10 }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-control" style={{ flex: 1 }} value={form.drive_link}
                  onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))}
                  placeholder="Paste Drive link…" />
                <button type="button" disabled={!shotFileObj}
                  onClick={() => alert('Google Drive upload — coming soon!')}
                  style={{ padding: '0 16px', borderRadius: 8, border: '1px solid', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', cursor: shotFileObj ? 'pointer' : 'not-allowed', transition: 'all 0.2s', background: shotFileObj ? 'rgba(66,133,244,0.12)' : 'transparent', color: shotFileObj ? '#4285f4' : 'var(--muted)', borderColor: shotFileObj ? 'rgba(66,133,244,0.4)' : 'var(--border2)' }}>
                  ☁ Upload to Drive
                </button>
              </div>
              {!shotFileObj && <div style={{ marginTop: 5, fontSize: 11, color: 'var(--muted)' }}>Browse a file above to enable upload</div>}
            </div>
          </div>
        </div>

        <div className="divider" />
        <p className="form-label" style={{ marginBottom: 12 }}>Department Statuses</p>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { key: 'status_roto', label: 'Roto' },
            { key: 'status_paint', label: 'Paint' },
            { key: 'status_tracking', label: 'Tracking' },
            { key: 'status_cg', label: 'CG' },
            { key: 'status_comp', label: 'Comp' },
          ].map(({ key, label }) => (
            <div key={key} className="form-group">
              <label className="form-label">{label}</label>
              <StatusSelectDropdown value={form[key]} onChange={val => setForm(f => ({ ...f, [key]: val }))} />
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : editShot ? 'Save Changes' : 'Add Shot'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
