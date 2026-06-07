import Modal from '../Modal'
import { DeptBadge, FeedbackBadge, TaskBadge } from '../StatusBadge'
import { DEPT_STATUSES } from '../dropdowns'

export function ShotDetailsModal({
  shot, outsourceEntries, users, canAdmin,
  detailsVersions, detailsFiles, detailsLogs,
  detailsActiveTab, setDetailsActiveTab,
  showDetailAddVersion, setShowDetailAddVersion,
  detailVersionForm, setDetailVersionForm,
  savingDetailVersion,
  detailFeedbackVersion, setDetailFeedbackVersion,
  detailFeedbackForm, setDetailFeedbackForm,
  savingDetailFeedback,
  editingDetailStatus, setEditingDetailStatus,
  detailStatusForm, setDetailStatusForm,
  savingDetailStatus,
  uploadForm, setUploadForm,
  uploadFileObj, uploading, uploadMsg,
  showAddCorrection, setShowAddCorrection,
  corrText, setCorrText,
  onSubmitVersion, onSaveFeedback, onDeleteVersion,
  onEditStatusOpen, onSaveStatus,
  onFileChange, onDetailUpload,
  onScreenshotChange, onDetailSubmitCorrection,
  nextVersionNumber, username,
  onClose,
}) {
  if (!shot) return null

  return (
    <Modal
      title={`Shot Dashboard — ${shot.shot_name}`}
      onClose={onClose}
      size="modal-xl"
    >
      <div className="shot-popup-grid">
        {/* Left Column: Sidebar */}
        <div className="shot-popup-sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontWeight: 700 }}>Shot Overview</span>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>{shot.shot_name}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {shot.sequence && <span className="badge badge-secondary">{shot.sequence}</span>}
              {shot.task_name && <span className="badge badge-purple">{shot.task_name}</span>}
              {shot.frame_count && <span className="badge badge-yellow">{shot.frame_count} frames</span>}
            </div>
          </div>

          <div className="divider" style={{ margin: '10px 0' }} />

          <div className="shot-meta-card">
            <div className="title">Assignment Type</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              {shot.outsourced ? (
                <span className="badge badge-outsource" style={{ fontSize: '11px', padding: '4px 10px' }}>📤 Outsourced</span>
              ) : (
                <span className="badge badge-blue" style={{ fontSize: '11px', padding: '4px 10px' }}>🏠 In-house</span>
              )}
            </div>
          </div>

          <div className="shot-meta-card">
            <div className="title">Assigned Artist(s)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {!shot.assigned_artist ? (
                <span className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>Unassigned</span>
              ) : (
                shot.assigned_artist.split(',').map(name => {
                  const uObj = users.find(u => u.username === name.trim())
                  return (
                    <span key={name} className="badge badge-artist" style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--green)', border: '1px solid rgba(0,229,160,0.2)' }}>
                      👤 {uObj?.display_name || name.trim()}
                    </span>
                  )
                })
              )}
            </div>
          </div>

          {!shot.outsourced && (
            <div className="shot-meta-card">
              <div className="title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Hours Tracker</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>{shot.logged_hours || 0}h / {shot.est_hours || 0}h</span>
              </div>
              {(() => {
                const est = shot.est_hours || 0; const logged = shot.logged_hours || 0
                if (est <= 0) return <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>No estimated hours recorded</div>
                const pct = Math.min(Math.round((logged / est) * 100), 100)
                const over = logged > est
                const barColor = over ? 'var(--red)' : pct >= 90 ? 'var(--yellow)' : 'var(--green)'
                return (
                  <div style={{ marginTop: 6 }}>
                    <div className="popup-eta-progress"><div className="popup-eta-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: over ? 'var(--red)' : 'var(--muted)', fontWeight: 700, marginTop: 2 }}>
                      <span>{pct}% Consumed</span>
                      <span>{over ? 'OVER BUDGET' : `${(est - logged).toFixed(1)}h remaining`}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {shot.outsourced && (
            <div className="shot-meta-card" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.02)' }}>
              <div className="title" style={{ color: 'var(--outsource)' }}>Outsource Contracts</div>
              {(() => {
                const os = outsourceEntries.find(o => o.shot_id === shot.id)
                if (!os) return <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>No outsource entry logged</div>
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, fontSize: '12px' }}>
                    <div>🏢 <strong>Vendor:</strong> {os.vendor}</div>
                    <div>💰 <strong>Cost:</strong> <span style={{ color: 'var(--outsource)', fontWeight: 'bold' }}>₹{Math.round(os.cost).toLocaleString('en-IN')}</span></div>
                    {os.delivery_date && <div>📅 <strong>Delivery:</strong> {os.delivery_date}</div>}
                  </div>
                )
              })()}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {shot.folder_link ? (
              <a href={shot.folder_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>📁 Drive Folder</a>
            ) : (
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', opacity: 0.5 }} disabled>📁 No Folder Link</button>
            )}
            {shot.preview_link ? (
              <a href={shot.preview_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>▶ Play Preview</a>
            ) : (
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', opacity: 0.5 }} disabled>▶ No Preview</button>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Pipeline Status */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontWeight: 700 }}>Department Statuses</span>
              {canAdmin && !editingDetailStatus && (
                <button className="btn btn-ghost btn-sm" onClick={onEditStatusOpen}>✏ Edit</button>
              )}
              {editingDetailStatus && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingDetailStatus(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={onSaveStatus} disabled={savingDetailStatus}>Save</button>
                </div>
              )}
            </div>
            {editingDetailStatus ? (
              <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[
                  { key: 'status_roto', label: 'Roto' }, { key: 'status_paint', label: 'Paint' },
                  { key: 'status_tracking', label: 'Tracking' }, { key: 'status_cg', label: 'CG' }, { key: 'status_comp', label: 'Comp' },
                ].map(({ key, label }) => (
                  <div key={key} className="form-group">
                    <label className="form-label" style={{ fontSize: '9px' }}>{label}</label>
                    <select className="form-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={detailStatusForm[key]}
                      onChange={e => setDetailStatusForm(f => ({ ...f, [key]: e.target.value }))}>
                      {DEPT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Roto', val: shot.status_roto }, { label: 'Paint', val: shot.status_paint },
                  { label: 'Tracking', val: shot.status_tracking }, { label: 'CG', val: shot.status_cg }, { label: 'Comp', val: shot.status_comp },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: '60px' }}>
                    <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>{label}</span>
                    <DeptBadge status={val} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="details-tab-bar">
            <button className={`details-tab-btn ${detailsActiveTab === 'versions' ? 'active' : ''}`} onClick={() => setDetailsActiveTab('versions')}>🎞 Versions ({detailsVersions.length})</button>
            <button className={`details-tab-btn ${detailsActiveTab === 'files' ? 'active' : ''}`} onClick={() => setDetailsActiveTab('files')}>📂 Files ({detailsFiles.length})</button>
            <button className={`details-tab-btn ${detailsActiveTab === 'corrections' ? 'active' : ''}`} onClick={() => setDetailsActiveTab('corrections')}>📝 Corrections ({detailsLogs.length})</button>
          </div>

          <div className="tab-pane-content">
            {/* VERSIONS TAB */}
            {detailsActiveTab === 'versions' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  {!showDetailAddVersion ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      setDetailVersionForm({ version_number: nextVersionNumber(), date_sent: new Date().toISOString().split('T')[0], artist_name: username, batch_reference: '', delivery_notes: '' })
                      setShowDetailAddVersion(true)
                    }}>+ Submit New Version</button>
                  ) : (
                    <div style={{ padding: '14px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--surface)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12 }}>Submit Version</div>
                      <form onSubmit={onSubmitVersion}>
                        <div className="grid-2">
                          <div className="form-group"><label className="form-label">Version Number *</label><input className="form-control" value={detailVersionForm.version_number} onChange={e => setDetailVersionForm(v => ({ ...v, version_number: e.target.value }))} placeholder="v01" required /></div>
                          <div className="form-group"><label className="form-label">Date Sent</label><input className="form-control" type="date" value={detailVersionForm.date_sent} onChange={e => setDetailVersionForm(v => ({ ...v, date_sent: e.target.value }))} /></div>
                          <div className="form-group"><label className="form-label">Artist Name</label><input className="form-control" value={detailVersionForm.artist_name} onChange={e => setDetailVersionForm(v => ({ ...v, artist_name: e.target.value }))} /></div>
                          <div className="form-group"><label className="form-label">Batch Reference</label><input className="form-control" value={detailVersionForm.batch_reference} onChange={e => setDetailVersionForm(v => ({ ...v, batch_reference: e.target.value }))} placeholder="BATCH_01" /></div>
                        </div>
                        <div className="form-group mt-2"><label className="form-label">Delivery Notes</label><textarea className="form-control" rows={2} value={detailVersionForm.delivery_notes} onChange={e => setDetailVersionForm(v => ({ ...v, delivery_notes: e.target.value }))} placeholder="Version notes..." /></div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDetailAddVersion(false)}>Cancel</button>
                          <button type="submit" className="btn btn-primary btn-sm" disabled={savingDetailVersion}>Submit</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {detailFeedbackVersion && (
                  <div style={{ padding: '14px', border: '1px solid rgba(255,159,67,0.2)', borderRadius: 10, background: 'var(--surface)', marginBottom: 14 }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--coord)', textTransform: 'uppercase', marginBottom: 12 }}>Update Feedback — {detailFeedbackVersion.version_number}</div>
                    <form onSubmit={onSaveFeedback}>
                      <div className="grid-2">
                        <div className="form-group"><label className="form-label">Feedback Status</label>
                          <select className="form-control" value={detailFeedbackForm.feedback_status} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_status: e.target.value }))}>
                            <option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Changes Required">Changes Required</option><option value="No Feedback">No Feedback</option>
                          </select>
                        </div>
                        <div className="form-group"><label className="form-label">Task Status</label>
                          <select className="form-control" value={detailFeedbackForm.task_status} onChange={e => setDetailFeedbackForm(f => ({ ...f, task_status: e.target.value }))}>
                            <option value="Pending">Pending</option><option value="WIP">WIP</option><option value="Resolved">Resolved</option><option value="Approved">Approved</option><option value="Changes Req.">Changes Req.</option>
                          </select>
                        </div>
                        <div className="form-group"><label className="form-label">Feedback Date</label><input className="form-control" type="date" value={detailFeedbackForm.feedback_date} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_date: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Feedback Image URL</label><input className="form-control" value={detailFeedbackForm.feedback_image} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_image: e.target.value }))} placeholder="https://..." /></div>
                      </div>
                      <div className="form-group mt-2"><label className="form-label">Feedback Detail</label><textarea className="form-control" rows={2} value={detailFeedbackForm.feedback_detail} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_detail: e.target.value }))} placeholder="Client feedback detail..." /></div>
                      <div className="form-group mt-2"><label className="form-label">Action Required</label><textarea className="form-control" rows={2} value={detailFeedbackForm.action_required} onChange={e => setDetailFeedbackForm(f => ({ ...f, action_required: e.target.value }))} placeholder="Fixes required..." /></div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailFeedbackVersion(null)}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={savingDetailFeedback}>Save</button>
                      </div>
                    </form>
                  </div>
                )}

                {detailsVersions.length === 0 ? (
                  <div className="text-muted" style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px' }}>No versions uploaded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailsVersions.map(v => (
                      <div key={v.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontSize: '11px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{v.version_number}</div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>by {v.artist_name || '—'} {v.date_sent ? `• Sent ${v.date_sent}` : ''}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                            <FeedbackBadge status={v.feedback_status} />
                            <TaskBadge status={v.task_status} />
                            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: '10px' }}
                              onClick={() => { setDetailFeedbackVersion(v); setDetailFeedbackForm({ feedback_status: v.feedback_status, feedback_date: v.feedback_date || '', feedback_detail: v.feedback_detail || '', action_required: v.action_required || '', task_status: v.task_status, feedback_image: v.feedback_image || '' }) }}>
                              Feedback
                            </button>
                            {canAdmin && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '3px 6px', fontSize: '10px' }} onClick={() => onDeleteVersion(v.id)}>🗑</button>}
                          </div>
                        </div>
                        {(v.delivery_notes || v.feedback_detail || v.action_required) && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 8, fontSize: '12px' }}>
                            {v.delivery_notes && <div><strong>Delivery Notes:</strong> {v.delivery_notes}</div>}
                            {v.feedback_detail && <div style={{ color: 'var(--yellow)', background: 'rgba(255,214,10,0.03)', padding: '4px 8px', borderRadius: 4 }}><strong>Client Feedback:</strong> {v.feedback_detail}</div>}
                            {v.action_required && <div style={{ color: 'var(--red)', background: 'rgba(255,68,68,0.03)', padding: '4px 8px', borderRadius: 4 }}><strong>Action Req:</strong> {v.action_required}</div>}
                            {v.feedback_image && <div style={{ marginTop: 4 }}><a href={v.feedback_image} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '9px' }}>🖼 Feedback Image</a></div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FILES TAB */}
            {detailsActiveTab === 'files' && (
              <div>
                <div style={{ marginBottom: 14, padding: 12, border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--surface)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 10 }}>Upload File Version</div>
                  <form onSubmit={onDetailUpload}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '9px' }}>Version</label>
                        <input className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} value={uploadForm.version} onChange={e => setUploadForm(u => ({ ...u, version: e.target.value }))} placeholder="v01" required />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '9px' }}>Note (optional)</label>
                        <input className="form-control" style={{ padding: '6px 10px', fontSize: '12px' }} value={uploadForm.note} onChange={e => setUploadForm(u => ({ ...u, note: e.target.value }))} placeholder="pass detail" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input className="form-control" style={{ padding: '6px', fontSize: '12px', flex: 1 }} type="file" onChange={onFileChange} required />
                      <button className="btn btn-primary btn-sm" type="submit" disabled={uploading || !uploadFileObj}>Upload</button>
                    </div>
                    {uploadMsg && <div style={{ fontSize: '11px', marginTop: 6, color: uploadMsg.includes('fail') ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{uploadMsg}</div>}
                  </form>
                </div>

                {detailsFiles.length === 0 ? (
                  <div className="text-muted" style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px' }}>No uploaded files found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailsFiles.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <div style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{f.version}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.name}</div>
                          {f.note && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Note: {f.note}</div>}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--muted)', minWidth: '100px' }}>
                          <div>by {f.uploaded_by}</div>
                          <div>{new Date(f.created_at).toLocaleDateString('en-IN')}</div>
                        </div>
                        {f.data && <a href={f.data} download={f.name} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>↓</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CORRECTIONS TAB */}
            {detailsActiveTab === 'corrections' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  {!showAddCorrection ? (
                    <button className="btn btn-danger btn-sm" onClick={() => setShowAddCorrection(true)}>+ Add Correction Note</button>
                  ) : (
                    <div style={{ padding: '14px', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, background: 'var(--surface)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 12 }}>New Correction Log</div>
                      <form onSubmit={onDetailSubmitCorrection}>
                        <div className="form-group"><label className="form-label">Note / Correction text *</label><textarea className="form-control" rows={2} value={corrText} onChange={e => setCorrText(e.target.value)} placeholder="Describe correction needed…" required /></div>
                        <div className="form-group mt-2"><label className="form-label">Attach Screenshot (optional)</label><input className="form-control" type="file" accept="image/*" onChange={onScreenshotChange} /></div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddCorrection(false)}>Cancel</button>
                          <button type="submit" className="btn btn-danger btn-sm">Save Log</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {detailsLogs.length === 0 ? (
                  <div className="text-muted" style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px' }}>No corrections logged.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailsLogs.map(l => (
                      <div key={l.id} style={{ padding: 12, background: 'var(--surface)', border: '1px solid rgba(255,68,68,0.15)', borderLeft: '3px solid var(--red)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--coord)' }}>{l.by} ({l.by_role})</span>
                          <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{new Date(l.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>{l.text}</div>
                        {l.screenshot && (
                          <div style={{ marginTop: 6 }}>
                            <a href={l.screenshot} target="_blank" rel="noreferrer">
                              <img src={l.screenshot} alt="screenshot" style={{ maxWidth: '100%', maxHeight: 70, borderRadius: 4, border: '1px solid var(--border)' }} />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
