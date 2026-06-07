import Modal from '../Modal'

export function ImportShotsModal({ show, importShotsData, importPreviewError, importing, onFileChange, onConfirm, onClose }) {
  if (!show) return null

  return (
    <Modal title="Import Shots from Excel" onClose={onClose} size="modal-lg">
      <div style={{ background: 'rgba(255,159,67,0.06)', border: '1px solid rgba(255,159,67,0.2)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '12px', color: 'var(--coord)' }}>
        Excel columns required: <strong>Shot Name, Frames, Task, Est. Hours, Assigned To</strong>. Download the sample template above to get started.
      </div>
      <div className="form-group">
        <label className="form-label">Upload Excel File (.xlsx)</label>
        <input className="form-control" type="file" accept=".xlsx" onChange={onFileChange} />
      </div>
      {importPreviewError && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: 8 }}>{importPreviewError}</div>}
      {importShotsData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Preview — {importShotsData.length} shots found:</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '6px 12px' }}>Shot</th>
                  <th style={{ padding: '6px 12px' }}>Task</th>
                  <th style={{ padding: '6px 12px' }}>Frames</th>
                  <th style={{ padding: '6px 12px' }}>Est.Hrs</th>
                  <th style={{ padding: '6px 12px' }}>Artist</th>
                </tr>
              </thead>
              <tbody>
                {importShotsData.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', fontWeight: 700 }}>{s.shot_name}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--purple)' }}>{s.task_name || '—'}</td>
                    <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', color: 'var(--yellow)' }}>{s.frame_count || '—'}</td>
                    <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{s.est_hours || '—'}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--green)' }}>{s.assigned_artist || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={importing || !importShotsData.length}>
          {importing ? 'Importing…' : 'Import Shots'}
        </button>
      </div>
    </Modal>
  )
}
