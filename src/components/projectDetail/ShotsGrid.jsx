import { DEPT_STATUSES } from '../dropdowns/constants'

const STATUS_BADGES = {
  'Pending': 'badge-pending',
  'WIP': 'badge-wip',
  'Done': 'badge-done',
  'Approved': 'badge-approved',
  'N/A': 'badge-na',
}

function getActiveStatusField(shot) {
  const taskKey = (shot.task_name || '').toLowerCase()
  if (taskKey === 'roto') return 'status_roto'
  if (taskKey === 'prep' || taskKey === 'paint') return 'status_paint'
  if (taskKey === 'tracking') return 'status_tracking'
  if (taskKey === 'cg' || taskKey === 'dmp' || taskKey === 'fx') return 'status_cg'
  if (taskKey === 'comp') return 'status_comp'
  
  if (shot.status_comp !== 'N/A') return 'status_comp'
  if (shot.status_roto !== 'N/A') return 'status_roto'
  if (shot.status_paint !== 'N/A') return 'status_paint'
  if (shot.status_tracking !== 'N/A') return 'status_tracking'
  if (shot.status_cg !== 'N/A') return 'status_cg'
  return 'status_comp'
}

export function ShotsGrid({
  shots, canAdmin, onUpdateStatus, onOpenDetails, uploadingThumbs,
  onThumbClick, onThumbHoverStart, onThumbHoverEnd, onPreview
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
    <div className="shots-grid">
      {shots.map(shot => {
        const activeStatusField = getActiveStatusField(shot)
        const activeStatus = shot[activeStatusField] || 'Pending'
        const badgeClass = STATUS_BADGES[activeStatus] || 'badge-pending'
        
        return (
          <div
            key={shot.id}
            className="shot-card"
            onClick={() => onOpenDetails(shot)}
          >
            {/* Thumbnail preview */}
            <div className="card-media" onClick={e => e.stopPropagation()}>
              {uploadingThumbs.has(shot.id) ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
                  <span className="spinner" style={{ width: 20, height: 20 }} />
                </div>
              ) : shot.thumbnail_status === 'done' && shot.thumbnail_url ? (
                <img
                  className="card-media-img"
                  src={shot.thumbnail_url}
                  alt={shot.shot_name}
                  loading="lazy"
                  onClick={() => onThumbClick(shot.thumbnail_url)}
                  onMouseEnter={e => onThumbHoverStart(shot.thumbnail_url, e.currentTarget)}
                  onMouseLeave={onThumbHoverEnd}
                  style={{ cursor: 'zoom-in' }}
                />
              ) : shot.preview_link ? (
                <img
                  className="card-media-img"
                  src={shot.preview_link}
                  alt={shot.shot_name}
                  loading="lazy"
                  onClick={() => onPreview(shot.preview_link)}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <div className="card-media-placeholder">
                  <span className="icon">🎞</span>
                  <span>No Thumbnail</span>
                </div>
              )}
            </div>

            {/* Card Body */}
            <div className="card-body">
              <div className="card-shot-header">
                <h3 className="card-shot-name">{shot.shot_name}</h3>
                {shot.task_name && <span className="badge badge-purple">{shot.task_name}</span>}
              </div>

              <div className="card-row">
                <span className="card-label">Artist</span>
                <span className="card-value" title={shot.assigned_artist || 'Unassigned'}>
                  {shot.assigned_artist || 'Unassigned'}
                </span>
              </div>

              <div className="card-row">
                <span className="card-label">Status</span>
                {canAdmin ? (
                  <select
                    className={`card-select badge ${badgeClass}`}
                    value={activeStatus}
                    onClick={e => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation()
                      onUpdateStatus(shot.id, activeStatusField, e.target.value)
                    }}
                    style={{ border: 'none', padding: '3px 8px 3px 6px' }}
                  >
                    {DEPT_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`badge ${badgeClass}`}>{activeStatus}</span>
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div className="card-footer">
              <span className="card-frames">🎞 {shot.frame_count ? `${shot.frame_count}f` : '—'}</span>
              {shot.version_count > 0 && (
                <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>
                  {shot.version_count} v
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
