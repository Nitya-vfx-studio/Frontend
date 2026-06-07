import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { ArtistSelectDropdown, StatusSelectDropdown, TaskSelectDropdown, TASK_OPTIONS } from '../dropdowns'

export function AddEditShotModal({ show, editShot, form, setForm, saving, shotFileObj, setShotFileObj, users, isOwner, onSave, onClose }) {
  const [haveDriveLink, setHaveDriveLink] = useState(false)

  useEffect(() => {
    if (form.drive_link) {
      setHaveDriveLink(true)
    } else {
      setHaveDriveLink(false)
    }
  }, [form.drive_link, show, editShot])

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
              {isOwner && (
                <div className="form-group">
                  <label className="form-label">Outsource Cost (₹) *</label>
                  <input className="form-control" type="number" value={form.cost || ''}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    placeholder="e.g. 15000" min="0" required />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Delivery Date</label>
                <input className="form-control" type="date" value={form.delivery_date || ''}
                  onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
              </div>
            </>
          )}

          <div className="media-setup-panel">
            <div className="media-setup-title">
              🎬 Video & Previews (Optional)
            </div>

            <div className="media-setup-grid">
              {/* Part 1: Local Video File (for Thumbnail Generation) */}
              <div className="media-upload-card">
                <label className="form-label" style={{ fontSize: 10 }}>Local Video File (Generates Thumbnail)</label>
                <div className="media-dragzone">
                  <input type="file" accept="video/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setShotFileObj(file);
                      }
                    }} />
                  <div className="media-dragzone-icon">💻</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Browse or drag local video</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>For browser-side thumbnail preview</div>
                </div>

                {shotFileObj && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--green)', fontSize: 13 }}>✓</span>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }} title={shotFileObj.name}>{shotFileObj.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{(shotFileObj.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShotFileObj(null);
                        setForm(f => ({ ...f, upload_to_drive: false }));
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: '2px' }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Part 2: Cloud Preview */}
              <div className="media-cloud-card">
                <label className="form-label" style={{ fontSize: 10, marginBottom: 2 }}>Cloud Sharing (Google Drive)</label>
                
                {/* Switch-Type Toggles */}
                <div className="media-toggle-row">
                  <label className="switch-container">
                    <div className="switch-label-group">
                      <span className="switch-title">Upload to drive</span>
                      <span className="switch-desc">Auto-upload video preview on save</span>
                    </div>
                    <div style={{ position: 'relative', height: 24 }}>
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={form.upload_to_drive || false}
                        onChange={e => {
                          const checked = e.target.checked;
                          setForm(f => ({
                            ...f,
                            upload_to_drive: checked,
                            drive_link: checked ? '' : f.drive_link
                          }));
                          if (checked) {
                            setHaveDriveLink(false);
                          }
                        }}
                      />
                      <span className="switch-slider"></span>
                    </div>
                  </label>

                  <label className="switch-container">
                    <div className="switch-label-group">
                      <span className="switch-title">Have a drive link</span>
                      <span className="switch-desc">Paste Google Drive sharing URL</span>
                    </div>
                    <div style={{ position: 'relative', height: 24 }}>
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={haveDriveLink}
                        onChange={e => {
                          const checked = e.target.checked;
                          setHaveDriveLink(checked);
                          if (checked) {
                            setForm(f => ({
                              ...f,
                              upload_to_drive: false
                            }));
                          } else {
                            setForm(f => ({
                              ...f,
                              drive_link: ''
                            }));
                          }
                        }}
                      />
                      <span className="switch-slider"></span>
                    </div>
                  </label>
                </div>

                {/* Warning/Helper Information */}
                {form.upload_to_drive && !shotFileObj && (
                  <span style={{ fontSize: 10, color: 'var(--yellow)', display: 'block', fontWeight: 600 }}>
                    ⚠️ Please select/browse a local video file to upload.
                  </span>
                )}

                {/* Conditionally Render Google Drive link input */}
                {haveDriveLink && (
                  <div style={{ marginTop: 2 }}>
                    <input
                      className="form-control"
                      value={form.drive_link || ''}
                      onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))}
                      placeholder="Paste Google Drive URL..."
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                  </div>
                )}

                {form.upload_to_drive && shotFileObj && (
                  <div style={{ fontSize: 10, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <span>✓</span> <span>Staged local video will be uploaded to Drive upon saving.</span>
                  </div>
                )}
              </div>
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
