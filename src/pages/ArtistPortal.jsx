import { useState, useEffect, useRef } from 'react'
import {
  getProjects, getShots, createTimeLog, getMyTimeLogs, updateUser,
  getShotFiles, uploadShotFile, getShotLogs, createShotLog
} from '../api'
import Modal from '../components/Modal'
import { useAuth } from '../hooks/useAuth'
import { msToHMS, msToHM, formatFileSize as fmtFileSize } from '../utils/formatters'
import './ArtistPortal.css'

export default function ArtistPortal() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [shots, setShots] = useState([])
  const [myLogs, setMyLogs] = useState([])
  const [selectedShot, setSelectedShot] = useState(null)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const timerRef = useRef(null)
  const startRef = useRef(null)

  // Files & Corrections Log states
  const [filesShot, setFilesShot] = useState(null)
  const [shotFiles, setShotFiles] = useState([])
  const [shotLogs, setShotLogs] = useState([])
  const [uploadForm, setUploadForm] = useState({ version: 'v01', note: '' })
  const [uploadFileObj, setUploadFileObj] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    loadData()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function loadData() {
    try {
      const [projRes, logsRes] = await Promise.all([getProjects(), getMyTimeLogs()])
      setProjects(projRes.data)
      setMyLogs(logsRes.data)

      // Load all shots assigned to this user across all projects
      const allShots = []
      for (const p of projRes.data) {
        try {
          const shotRes = await getShots(p.id, { assigned_artist: user.username })
          for (const s of shotRes.data) {
            allShots.push({ ...s, project_name: p.name })
          }
        } catch {}
      }

      // Parallelly fetch files and logs for each shot to get count
      const enrichedShots = await Promise.all(
        allShots.map(async (s) => {
          try {
            const [filesRes, logsRes] = await Promise.all([
              getShotFiles(s.project_id, s.id),
              getShotLogs(s.project_id, s.id)
            ])
            return {
              ...s,
              files: filesRes.data,
              logs: logsRes.data
            }
          } catch {
            return {
              ...s,
              files: [],
              logs: []
            }
          }
        })
      )
      setShots(enrichedShots)

      // Sync selectedShot if open
      if (selectedShot) {
        const found = enrichedShots.find(s => s.id === selectedShot.id)
        if (found) setSelectedShot(found)
      }
    } catch (e) {
      console.error(e)
    }
  }

  function selectShot(shot) {
    if (running) return // don't switch while running
    setSelectedShot(shot)
  }

  function startTimer() {
    if (!selectedShot) return
    setRunning(true)
    startRef.current = Date.now() - elapsed
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current)
    }, 500)
  }

  async function stopTimer() {
    if (!timerRef.current) return
    clearInterval(timerRef.current)
    timerRef.current = null
    const durationMs = elapsed
    setRunning(false)
    if (durationMs < 1000 || !selectedShot) {
      setElapsed(0)
      return
    }
    setSaving(true)
    try {
      await createTimeLog({
        shot_id: selectedShot.id,
        log_date: today,
        duration_ms: durationMs,
        sessions: 1,
      })
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 3000)
      setElapsed(0)
      await loadData()
    } catch {
      setSaveMsg('Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Files & Corrections Log operations
  const openFilesModal = async (shot) => {
    setFilesShot(shot)
    setUploadForm({ version: 'v01', note: '' })
    setUploadFileObj(null)
    setUploadMsg('')
    try {
      const [fRes, lRes] = await Promise.all([
        getShotFiles(shot.project_id, shot.id),
        getShotLogs(shot.project_id, shot.id)
      ])
      setShotFiles(fRes.data)
      setShotLogs(lRes.data)
      // Auto-increment next version for artist
      if (fRes.data.length > 0) {
        const nums = fRes.data
          .filter(f => f.uploaded_by_role === 'artist')
          .map(f => parseInt(f.version?.replace(/\D/g, '') || '0'))
          .filter(n => !isNaN(n))
        const next = Math.max(...nums, 0) + 1
        setUploadForm(u => ({ ...u, version: `v${String(next).padStart(2, '0')}` }))
      }
    } catch (err) {
      console.error("Failed to load files/logs:", err)
    }
  }

  const handleShotFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadFileObj({
        name: file.name,
        size: file.size,
        type: file.type,
        data: ev.target.result // Base64
      })
    }
    reader.readAsDataURL(file)
  }

  const handleUploadShotFile = async (e) => {
    e.preventDefault()
    if (!uploadFileObj || !filesShot) return
    setUploading(true)
    setUploadMsg('')
    try {
      await uploadShotFile(filesShot.project_id, filesShot.id, {
        ...uploadFileObj,
        version: uploadForm.version,
        note: uploadForm.note,
        uploaded_by: user.display_name || user.username,
        uploaded_by_role: 'artist'
      })
      setUploadMsg('Uploaded!')
      setUploadFileObj(null)
      const fileInput = document.getElementById('sfm-file-input-artist')
      if (fileInput) fileInput.value = ''
      
      setUploadForm(u => ({ ...u, note: '' }))
      const fRes = await getShotFiles(filesShot.project_id, filesShot.id)
      setShotFiles(fRes.data)
      
      const nums = fRes.data
        .filter(f => f.uploaded_by_role === 'artist')
        .map(f => parseInt(f.version?.replace(/\D/g, '') || '0'))
        .filter(n => !isNaN(n))
      const next = Math.max(...nums, 0) + 1
      setUploadForm(u => ({ ...u, version: `v${String(next).padStart(2, '0')}` }))

      // Update shots list reactively
      setShots(prev => prev.map(s => {
        if (s.id === filesShot.id) {
          return { ...s, files: fRes.data }
        }
        return s
      }))
      setTimeout(() => setUploadMsg(''), 3000)
    } catch {
      setUploadMsg('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const todayLogs = myLogs.filter(l => l.log_date === today)
  const todayTotalMs = todayLogs.reduce((s, l) => s + l.duration_ms, 0)
  const hourlyRate = user.hourly_rate || 0
  const todayEarned = (todayTotalMs / 3600000) * hourlyRate

  const pct = elapsed > 0
    ? Math.min((elapsed / ((selectedShot?.est_hours || 8) * 3600000)) * 100, 100)
    : 0

  let barBackground = ''
  if (pct > 85) {
    barBackground = 'linear-gradient(90deg, var(--error), #ff7b7b)'
  } else if (pct > 60) {
    barBackground = 'linear-gradient(90deg, var(--warning), var(--accent))'
  }

  return (
    <div className="artist-portal">
      {/* Header */}
      <div className="artist-header">
        <div className="artist-header-left">
          <div className="artist-avatar">{user.username?.[0]?.toUpperCase()}</div>
          <div>
            <div className="artist-name">{user.display_name || user.username}</div>
            <div className="artist-role">Artist Portal</div>
          </div>
        </div>
        <div className="artist-header-stats">
          <div className="ap-stat">
            <div className="ap-stat-lbl">Today Total</div>
            <div className="ap-stat-val ap-blue">{msToHM(todayTotalMs)}</div>
          </div>
          {hourlyRate > 0 && (
            <div className="ap-stat">
              <div className="ap-stat-lbl">Today Earned</div>
              <div className="ap-stat-val ap-green">₹{Math.round(todayEarned).toLocaleString('en-IN')}</div>
            </div>
          )}
          <div className="ap-stat">
            <div className="ap-stat-lbl">Date</div>
            <div className="ap-stat-val" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Timer Panel */}
      <div className="timer-panel">
        <div className="timer-shot-label">
          {selectedShot ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div><strong>{selectedShot.shot_name}</strong> <span className="text-muted">— {selectedShot.project_name}</span></div>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => openFilesModal(selectedShot)}>
                📂 Files & Corrections
              </button>
            </div>
          ) : (
            <span className="text-muted">No shot selected — click a shot below to begin</span>
          )}
        </div>
        <div className={`timer-clock ${running ? 'timer-running' : ''}`}>{msToHMS(elapsed)}</div>
        <div className={`timer-bar-bg ${running ? 'timer-running-bar' : ''}`}>
          <div className="timer-bar-fill" style={{ width: `${pct}%`, background: barBackground }} />
        </div>
        <div className="timer-controls">
          {!running ? (
            <button className="btn btn-success" onClick={startTimer} disabled={!selectedShot}>
              ▶ Start Timer
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopTimer} disabled={saving}>
              ■ Stop & Save
            </button>
          )}
          {saveMsg && <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem' }}>{saveMsg}</span>}
        </div>
      </div>

      <div className="ap-two-col">
        {/* Shots grid */}
        <div>
          <div className="section-label">My Shots ({shots.length})</div>
          {shots.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div>No shots assigned to you yet.</div>
            </div>
          ) : (
            <div className="shots-list">
              {shots.map(s => {
                const shotLogs = myLogs.filter(l => l.shot_id === s.id)
                const loggedMs = shotLogs.reduce((sum, l) => sum + l.duration_ms, 0)
                const isSelected = selectedShot?.id === s.id
                
                const fileCount = s.files?.length || 0
                const adminFiles = s.files?.filter(f => f.uploaded_by_role !== 'artist')?.length || 0
                const correctionCount = s.logs?.length || 0

                return (
                  <div
                    key={s.id}
                    className={`shot-card ${isSelected ? 'shot-card-active' : ''} ${running && isSelected ? 'shot-card-running' : ''}`}
                    onClick={() => !running && selectShot(s)}
                    style={{ cursor: running ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="shot-card-top">
                      <strong className="shot-card-name">{s.shot_name}</strong>
                      {s.outsourced && <span className="badge badge-warning">Outsourced</span>}
                    </div>
                    <div className="shot-card-meta">
                      <span className="text-muted">{s.project_name}</span>
                      {s.task_name && <span className="badge badge-secondary">{s.task_name}</span>}
                    </div>
                    <div className="shot-card-stats">
                      {s.est_hours > 0 && <span>Est: {s.est_hours}h</span>}
                      {loggedMs > 0 && <span style={{ color: 'var(--accent)' }}>Logged: {msToHM(loggedMs)}</span>}
                    </div>

                    {/* Correction Alert badge */}
                    {correctionCount > 0 && (
                      <div style={{ marginTop: 8, background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 6, padding: '5px 8px', fontSize: '11px', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        💬 {correctionCount} correction note{correctionCount !== 1 ? 's' : ''} from coordinator
                      </div>
                    )}

                    {/* Action buttons footer */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                      {adminFiles > 0 ? (
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '11px', padding: '4px 6px' }} onClick={() => openFilesModal(s)}>
                          📥 Source Files ({adminFiles})
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: '11px', padding: '4px 6px', opacity: 0.5 }} disabled>
                          📥 No source yet
                        </button>
                      )}
                      <button className="btn btn-success btn-sm" style={{ flex: 1, fontSize: '11px', padding: '4px 6px' }} onClick={() => openFilesModal(s)}>
                        📤 Upload Output {fileCount > 0 && `(v${String(fileCount).padStart(2, '0')})`}
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Today's log + Change password */}
        <div>
          <div className="section-label">Today's Log</div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            {todayLogs.length === 0 ? (
              <div className="text-muted" style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                No sessions yet today.
              </div>
            ) : (
              todayLogs.map(l => (
                <div key={l.id} className="log-row">
                  <div className="log-dot" />
                  <div style={{ flex: 1 }}>
                    <strong>{l.shot_name}</strong>
                    <span className="text-muted" style={{ marginLeft: 8, fontSize: '0.8rem' }}>{l.project_name}</span>
                  </div>
                  <div style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>
                    {msToHM(l.duration_ms)}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Files & Corrections log Modal */}
      {filesShot && (
        <Modal title={`Files & Corrections — ${filesShot.shot_name}`} onClose={() => setFilesShot(null)} size="modal-lg">
          {/* Upload file section */}
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>Upload File Version</div>
            <form onSubmit={handleUploadShotFile} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Version</label>
                    <input className="form-control" value={uploadForm.version} onChange={e => setUploadForm(u => ({ ...u, version: e.target.value }))} placeholder="v01" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Note (optional)</label>
                    <input className="form-control" value={uploadForm.note} onChange={e => setUploadForm(u => ({ ...u, note: e.target.value }))} placeholder="Roto or Paint output note" />
                  </div>
                </div>
                <input id="sfm-file-input-artist" className="form-control" type="file" onChange={handleShotFileChange} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={uploading || !uploadFileObj}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
            {uploadMsg && <div style={{ color: uploadMsg.includes('fail') ? 'var(--red)' : 'var(--green)', fontSize: '12px', marginTop: 8, fontWeight: 700 }}>{uploadMsg}</div>}
          </div>

          {/* Versions list */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>Uploaded Versions</div>
            {shotFiles.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '12px', padding: '10px 0' }}>No versions uploaded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {shotFiles.map(f => {
                  const isImage = f.type && f.type.startsWith('image/')
                  return (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10 }}>
                      <div style={{ background: f.uploaded_by_role === 'artist' ? 'rgba(0,229,160,0.1)' : 'rgba(0,212,255,0.1)', color: f.uploaded_by_role === 'artist' ? 'var(--green)' : 'var(--accent)', padding: '2px 9px', borderRadius: 6, fontSize: '11px', fontWeight: 700, fontFamily: 'var(--mono)' }}>{f.version}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{f.name}</div>
                        {f.note && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Note: {f.note}</div>}
                        {isImage && (
                          <div style={{ marginTop: 6 }}>
                            <a href={f.data} target="_blank" rel="noreferrer">
                              <img src={f.data} alt="file preview" style={{ maxHeight: 80, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)' }} />
                            </a>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--muted)' }}>
                        <div>by {f.uploaded_by} ({f.uploaded_by_role})</div>
                        <div>{new Date(f.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      </div>
                      {f.data && (
                        <a href={f.data} download={f.name} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>↓</a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Correction log */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>Correction Log</div>
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
            <button className="btn btn-secondary" onClick={() => setFilesShot(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
