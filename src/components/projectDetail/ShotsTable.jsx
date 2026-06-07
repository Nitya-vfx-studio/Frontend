import { PipelineTracker } from '../StatusBadge'

// ETA badge derived purely from a shot's est/logged hours and outsource flag.
function getETATag(shot) {
  if (!shot.est_hours || shot.est_hours <= 0) {
    return <span className="badge badge-secondary" style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border2)' }}>No ETA</span>
  }
  if (shot.outsourced) {
    return <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--outsource)', border: '1px solid rgba(245,158,11,0.3)' }}>Outsourced</span>
  }
  const loggedH = shot.logged_hours || 0
  const rem = shot.est_hours - loggedH
  if (rem <= 0) {
    return <span className="badge badge-danger" style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.2)' }}>Over {Math.abs(rem).toFixed(1)}h</span>
  }
  if (loggedH / shot.est_hours >= 0.8) {
    return <span className="badge badge-warning" style={{ background: 'rgba(255,214,10,0.1)', color: 'var(--yellow)', border: '1px solid rgba(255,214,10,0.2)' }}>~{rem.toFixed(1)}h left</span>
  }
  return <span className="badge badge-success" style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--green)', border: '1px solid rgba(0,229,160,0.2)' }}>~{rem.toFixed(1)}h left</span>
}

export function ShotsTable({
  shots, outsourceEntries, canAdmin, uploadingThumbs,
  onRowClick, onOpenDetails, onOpenFiles, onEdit, onEditEta, onToggleOutsource, onDelete,
  onThumbClick, onThumbHoverStart, onThumbHoverEnd, onPreview,
}) {
  if (shots.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎞</div>
        <h3>No shots found</h3>
        <p>Add shots above or upload an Excel sheet.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ width: 70 }}>Thumb</th>
              <th>Shot</th>
              <th>Task</th>
              <th>Frames</th>
              <th>Type</th>
              <th>Pipeline status</th>
              <th>Artist</th>
              <th>Est. Hrs</th>
              <th>Logged</th>
              <th>ETA</th>
              {canAdmin && <th>Cost</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shots.map(shot => {
              const isOutsourced = shot.outsourced
              const outsource = outsourceEntries.find(o => o.shot_id === shot.id)

              return (
                <tr key={shot.id}
                  onClick={(e) => onRowClick(e, shot)}
                  style={{ cursor: 'pointer', background: isOutsourced ? 'rgba(245,158,11,0.02)' : undefined, borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ width: 70, padding: '4px 6px' }} onClick={e => e.stopPropagation()}>
                    {uploadingThumbs.has(shot.id) ? (
                      <div style={{ width: 64, height: 36, borderRadius: 4, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="spinner" style={{ width: 14, height: 14 }} />
                      </div>
                    ) : shot.thumbnail_status === 'done' && shot.thumbnail_url ? (
                      <img
                        src={shot.thumbnail_url}
                        alt={shot.shot_name}
                        loading="lazy"
                        onClick={() => onThumbClick(shot.thumbnail_url)}
                        onMouseEnter={e => onThumbHoverStart(shot.thumbnail_url, e.currentTarget)}
                        onMouseLeave={onThumbHoverEnd}
                        style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 4, display: 'block', border: '1px solid var(--border)', cursor: 'pointer' }}
                      />
                    ) : shot.preview_link ? (
                      <div className="shot-thumb" onClick={() => onPreview(shot.preview_link)} title="Click to preview">
                        <img src={shot.preview_link} alt={shot.shot_name} className="shot-thumb-img" />
                      </div>
                    ) : (
                      <div style={{ width: 64, height: 36, borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--muted)' }}>🎞</div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                    <button className="shot-name-link" onClick={(e) => { e.preventDefault(); onOpenDetails(shot); }}>
                      {shot.shot_name}
                    </button>
                    {shot.version_count > 0 && (
                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: 10, background: 'rgba(168,85,247,0.15)', color: 'var(--purple)', marginLeft: 6, border: '1px solid rgba(168,85,247,0.3)', fontWeight: 700 }}>
                        {shot.version_count} v
                      </span>
                    )}
                  </td>
                  <td>
                    {shot.task_name ? <span className="badge badge-purple">{shot.task_name}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--yellow)', fontSize: '12px' }}>{shot.frame_count ? `${shot.frame_count}f` : '—'}</td>
                  <td>
                    {isOutsourced ? (
                      <span className="badge badge-outsource"><i className="fas fa-arrow-up-right-from-square" style={{ marginRight: 3 }} /> Outsourced</span>
                    ) : (
                      <span className="badge badge-blue"><i className="fas fa-user" style={{ marginRight: 3 }} /> In-house</span>
                    )}
                  </td>
                  <td><PipelineTracker shot={shot} /></td>
                  <td className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{shot.assigned_artist || '—'}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{shot.est_hours ? `${shot.est_hours}h` : '—'}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--coord)' }}>{shot.logged_hours ? `${shot.logged_hours}h` : '—'}</td>
                  <td>{getETATag(shot)}</td>
                  {canAdmin && (
                    <td style={{ fontFamily: 'var(--mono)', color: isOutsourced ? 'var(--outsource)' : 'var(--accent)', fontWeight: 700 }}>
                      {isOutsourced && outsource ? `₹${Math.round(outsource.cost).toLocaleString('en-IN')}` : '—'}
                    </td>
                  )}
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => onOpenFiles(shot)} title="Files & Versions Log">📂 Files</button>
                      {canAdmin && (
                        <>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', borderColor: 'rgba(0,212,255,0.3)' }} onClick={() => onEdit(shot)} title="Edit Shot">✏️ Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => onEditEta(shot)} title="Edit Est. Hours">⏰</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--outsource)', borderColor: 'rgba(245,158,11,0.3)' }} onClick={() => onToggleOutsource(shot)} title={isOutsourced ? 'Set as In-house' : 'Set as Outsourced'}>
                            {isOutsourced ? '🏠' : '📤'}
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => onDelete(shot)} title="Delete">🗑</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
