import Modal from '../Modal'

export function FilesCorrectionsModal({
  filesShot, canAdmin,
  shotFiles, shotLogs,
  uploadForm, setUploadForm, uploadFileObj, uploading, uploadMsg,
  showAddCorrection, setShowAddCorrection,
  corrText, setCorrText,
  onFileChange, onUpload, onScreenshotChange, onSubmitCorrection, onClose,
}) {
  if (!filesShot) return null

  return (
    <Modal title={`Files & Corrections — ${filesShot.shot_name}`} onClose={onClose} size="modal-lg">
      {/* Upload file section */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>Upload File Version</div>
        <form onSubmit={onUpload} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Version</label>
                <input className="form-control" value={uploadForm.version} onChange={e => setUploadForm(u => ({ ...u, version: e.target.value }))} placeholder="v01" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Note (optional)</label>
                <input className="form-control" value={uploadForm.note} onChange={e => setUploadForm(u => ({ ...u, note: e.target.value }))} placeholder="Comp roto pass" />
              </div>
            </div>
            <input className="form-control" type="file" onChange={onFileChange} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={uploading || !uploadFileObj}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        {uploadMsg && <div style={{ color: uploadMsg.includes('fail') ? 'var(--red)' : 'var(--green)', fontSize: '12px', marginTop: 8, fontWeight: 700 }}>{uploadMsg}</div>}
      </div>

      {/* Files list */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>Uploaded Versions</div>
        {shotFiles.length === 0 ? (
          <div className="text-muted" style={{ fontSize: '12px', padding: '10px 0' }}>No versions uploaded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
            {shotFiles.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10 }}>
                <div style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent)', padding: '2px 9px', borderRadius: 6, fontSize: '11px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{f.version}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>{f.name}</div>
                  {f.note && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Note: {f.note}</div>}
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--muted)' }}>
                  <div>by {f.uploaded_by} ({f.uploaded_by_role})</div>
                  <div>{new Date(f.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
                {f.data && (
                  <a href={f.data} download={f.name} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>↓</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Correction log */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>Correction Log</div>
          {canAdmin && !showAddCorrection && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowAddCorrection(true)}>+ Add Correction</button>
          )}
        </div>

        {showAddCorrection && (
          <div style={{ marginBottom: 16, padding: 14, background: 'var(--surface)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10 }}>
            <div className="form-group">
              <label className="form-label">Note / Correction text *</label>
              <textarea className="form-control" rows={2} value={corrText} onChange={e => setCorrText(e.target.value)} placeholder="Describe correction needed…" required />
            </div>
            <div className="form-group mt-2">
              <label className="form-label">Attach Screenshot (optional)</label>
              <input className="form-control" type="file" accept="image/*" onChange={onScreenshotChange} />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: 12, border: 'none' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddCorrection(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={onSubmitCorrection}>Save Note</button>
            </div>
          </div>
        )}

        {shotLogs.length === 0 ? (
          <div className="text-muted" style={{ fontSize: '12px', padding: '10px 0' }}>No corrections logged.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
            {shotLogs.map(l => (
              <div key={l.id} style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid rgba(255,68,68,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--coord)' }}>{l.by} ({l.by_role})</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{new Date(l.created_at).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>{l.text}</div>
                {l.screenshot && (
                  <div style={{ marginTop: 8 }}>
                    <a href={l.screenshot} target="_blank" rel="noreferrer">
                      <img src={l.screenshot} alt="screenshot" style={{ maxWidth: '100%', maxHeight: 80, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)' }} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
