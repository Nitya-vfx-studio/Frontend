import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  getProject, getShots, createShot, updateShot, deleteShot,
  getShotFiles, uploadShotFile, getShotLogs, createShotLog,
  getOutsource, createOutsource, deleteOutsource, updateOutsource,
  getUsers, getVersions, createVersion, updateVersion, deleteVersion, getShot
} from '../api'
import Modal from '../components/Modal'
import { DeptBadge, FeedbackBadge, TaskBadge, PipelineTracker } from '../components/StatusBadge'
import './ProjectDetail.css'

const DEPT_STATUSES = ['Pending', 'WIP', 'Done', 'Approved', 'N/A']

const EMPTY_SHOT = {
  shot_name: '', frame_count: '',
  assigned_artist: '', shot_path: '', drive_link: '',
  status_roto: 'Pending', status_paint: 'Pending',
  status_tracking: 'Pending', status_cg: 'Pending', status_comp: 'Pending',
  est_hours: '', outsourced: false, task_name: '',
}

function downloadShotTemplate() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Shot Name', 'Frames', 'Task', 'Est. Hours', 'Assigned To'],
    ['SH_0010', 120, 'Roto', 8, ''],
  ])
  ws['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Shots Template')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'nitya_vfx_shots_template.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function ArtistSelectDropdown({ selectedArtists, users, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredUsers = users.filter(u => 
    (u.display_name || u.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleUser = (username) => {
    let next
    if (selectedArtists.includes(username)) {
      next = selectedArtists.filter(name => name !== username)
    } else {
      next = [...selectedArtists, username]
    }
    onChange(next.join(', '))
  }

  const clearAll = () => {
    onChange('')
    setIsOpen(false)
  }

  return (
    <div className="artist-select-container" ref={containerRef}>
      <div 
        className={`artist-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedArtists.length === 0 ? (
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Unassigned</span>
        ) : (
          selectedArtists.map(name => {
            const userObj = users.find(u => u.username === name)
            const displayName = userObj?.display_name || name
            return (
              <span 
                key={name} 
                className="badge badge-artist"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: 'rgba(0,229,160,0.15)',
                  color: 'var(--green)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleUser(name)
                }}
              >
                {displayName}
                <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }}>&times;</span>
              </span>
            )
          })
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '10px' }}>▼</span>
      </div>

      {isOpen && (
        <div className="artist-select-dropdown">
          <input 
            type="text" 
            placeholder="Search active users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
            autoFocus
          />

          <div className="artist-select-list">
            <div 
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                background: selectedArtists.length === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: 'var(--muted)',
                fontWeight: selectedArtists.length === 0 ? 'bold' : 'normal'
              }}
              onClick={clearAll}
            >
              ❌ Keep Unassigned
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            {filteredUsers.length === 0 ? (
              <span style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--muted)' }}>No users found</span>
            ) : (
              filteredUsers.map(u => {
                const isSelected = selectedArtists.includes(u.username)
                const roleLabel = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : ''
                return (
                  <div
                    key={u.username}
                    className={`artist-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleUser(u.username)}
                  >
                    <span>
                      {u.display_name || u.username}
                      {roleLabel && <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: 4 }}>[{roleLabel}]</span>}
                    </span>
                    {isSelected && <span>✓</span>}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const TASK_OPTIONS = ['Roto', 'Prep', 'Paint', 'Tracking', 'CG', 'Comp', 'DMP', 'FX', 'Other']

const STATUS_COLORS = {
  Pending:      { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  WIP:          { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  Done:         { bg: 'rgba(0,229,160,0.15)',   color: 'var(--green)' },
  Approved:     { bg: 'rgba(0,212,255,0.15)',   color: 'var(--accent)' },
  'N/A':        { bg: 'rgba(255,255,255,0.05)', color: 'var(--muted)' },
  'In-house':   { bg: 'rgba(0,212,255,0.12)',   color: 'var(--accent)' },
  'Outsourced': { bg: 'rgba(245,158,11,0.15)',  color: 'var(--coord)' },
}

function StatusSelectDropdown({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const opts = options ? options.map(o => o.value || o) : DEPT_STATUSES

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const colors = STATUS_COLORS[value] || STATUS_COLORS['Pending']

  return (
    <div className="artist-select-container" ref={containerRef}>
      <div className={`artist-select-trigger ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.bg, color: colors.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
          {value || 'Pending'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '10px' }}>▼</span>
      </div>
      {isOpen && (
        <div className="artist-select-dropdown">
          <div className="artist-select-list">
            {opts.map(s => {
              const label = options ? (options.find(o => (o.value || o) === s)?.label || s) : s
              const c = STATUS_COLORS[s] || {}
              return (
                <div key={s} className={`artist-option ${value === s ? 'selected' : ''}`} onClick={() => { onChange(s); setIsOpen(false) }}>
                  <span style={{ color: c.color, fontWeight: 600 }}>{label}</span>
                  {value === s && <span>✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskSelectDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const select = (task) => {
    onChange(task === value ? '' : task)
    setIsOpen(false)
  }

  return (
    <div className="artist-select-container" ref={containerRef}>
      <div
        className={`artist-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value ? (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'rgba(168,85,247,0.15)', color: 'var(--purple)',
              padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700
            }}
            onClick={e => { e.stopPropagation(); onChange('') }}
          >
            {value}
            <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }}>&times;</span>
          </span>
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Task</span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '10px' }}>▼</span>
      </div>

      {isOpen && (
        <div className="artist-select-dropdown">
          <div className="artist-select-list">
            {TASK_OPTIONS.map(task => (
              <div
                key={task}
                className={`artist-option ${value === task ? 'selected' : ''}`}
                onClick={() => select(task)}
              >
                <span>{task}</span>
                {value === task && <span>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [project, setProject] = useState(null)
  const [shots, setShots] = useState([])
  const [outsourceEntries, setOutsourceEntries] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])
  const [search, setSearch] = useState('')

  const showToast = (msg, type = 'error') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }
  const setError = msg => msg && showToast(msg, 'error')
  const setSuccess = msg => msg && showToast(msg, 'success')

  const [showAddShot, setShowAddShot] = useState(false)
  const [editShot, setEditShot] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_SHOT)
  const [saving, setSaving] = useState(false)

  // Details popup states
  const [selectedDetailsShot, setSelectedDetailsShot] = useState(null)
  const [detailsVersions, setDetailsVersions] = useState([])
  const [detailsFiles, setDetailsFiles] = useState([])
  const [detailsLogs, setDetailsLogs] = useState([])
  const [detailsActiveTab, setDetailsActiveTab] = useState('versions')

  // Version sub-states in details popup
  const [showDetailAddVersion, setShowDetailAddVersion] = useState(false)
  const [detailVersionForm, setDetailVersionForm] = useState({ version_number: '', date_sent: '', artist_name: '', batch_reference: '', delivery_notes: '' })
  const [savingDetailVersion, setSavingDetailVersion] = useState(false)
  const [detailFeedbackVersion, setDetailFeedbackVersion] = useState(null)
  const [detailFeedbackForm, setDetailFeedbackForm] = useState({ feedback_status: 'Pending', feedback_date: '', feedback_detail: '', action_required: '', task_status: 'Pending', feedback_image: '' })
  const [savingDetailFeedback, setSavingDetailFeedback] = useState(false)

  // Status edit inside details popup
  const [editingDetailStatus, setEditingDetailStatus] = useState(false)
  const [detailStatusForm, setDetailStatusForm] = useState({})
  const [savingDetailStatus, setSavingDetailStatus] = useState(false)
  
  // SheetJS Excel Import
  const [showImport, setShowImport] = useState(false)
  const [importShotsData, setImportShotsData] = useState([])
  const [importPreviewError, setImportPreviewError] = useState('')
  const [importing, setImporting] = useState(false)

  // Quick add form
  const [quickForm, setQuickForm] = useState({ shot_name: '', task_name: '', frame_count: '', est_hours: '', assigned_artist: '', amount: '', preview_video_data: '', preview_video_name: '' })

  // Inline modals
  const [lightboxSrc, setLightboxSrc] = useState(null) // preview lightbox
  const [shotFileObj, setShotFileObj] = useState(null)  // local file picked for Drive upload

  const [showEditEta, setShowEditEta] = useState(null) // holds shot
  const [etaInput, setEtaInput] = useState('')
  const [showOsCost, setShowOsCost] = useState(null) // holds shot
  const [osForm, setOsForm] = useState({ vendor: '', cost: '', delivery_date: '' })

  // Shot Files & Versions Log Modal
  const [filesShot, setFilesShot] = useState(null) // holds shot
  const [shotFiles, setShotFiles] = useState([])
  const [shotLogs, setShotLogs] = useState([])
  const [uploadForm, setUploadForm] = useState({ version: '', note: '' })
  const [uploadFileObj, setUploadFileObj] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  
  // Correction logs
  const [showAddCorrection, setShowAddCorrection] = useState(false)
  const [corrText, setCorrText] = useState('')
  const [screenshotObj, setScreenshotObj] = useState(null)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const canAdmin = ['coordinator', 'admin'].includes(user.role)

  const load = async () => {
    try {
      setLoading(true)
      const [pRes, sRes, osRes, uRes] = await Promise.all([
        getProject(projectId),
        getShots(projectId),
        getOutsource({ project_id: projectId }),
        getUsers(),
      ])
      setProject(pRes.data)
      setShots(sRes.data)
      setOutsourceEntries(osRes.data)
      setUsers(uRes.data.filter(u => u.is_active))
    } catch {
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const openAdd = () => {
    setForm(EMPTY_SHOT)
    setShowAddShot(true)
  }

  const openEdit = (shot) => {
    const outsource = outsourceEntries.find(o => o.shot_id === shot.id)
    setForm({
      shot_name: shot.shot_name,
      frame_count: shot.frame_count || '',
      assigned_artist: shot.assigned_artist || '',
      shot_path: shot.folder_link || '',
      drive_link: shot.preview_link || '',
      status_roto: shot.status_roto,
      status_paint: shot.status_paint,
      status_tracking: shot.status_tracking,
      status_cg: shot.status_cg,
      status_comp: shot.status_comp,
      est_hours: shot.est_hours || '',
      outsourced: shot.outsourced || false,
      task_name: shot.task_name || '',
      vendor: outsource?.vendor || '',
      cost: outsource?.cost || '',
      delivery_date: outsource?.delivery_date || '',
    })
    setEditShot(shot)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        frame_count: form.frame_count ? parseInt(form.frame_count) : null,
        est_hours: form.est_hours ? parseFloat(form.est_hours) : 0,
        folder_link: form.shot_path || null,
        preview_link: form.drive_link || null,
      }
      
      let savedShot;
      if (editShot) {
        const res = await updateShot(projectId, editShot.id, payload)
        savedShot = res.data
      } else {
        const res = await createShot(projectId, payload)
        savedShot = res.data
      }

      // Handle outsource entry
      const targetShotId = editShot?.id || savedShot.id
      const existingOs = outsourceEntries.find(o => o.shot_id === targetShotId)

      if (form.outsourced) {
        if (existingOs) {
          await updateOutsource(existingOs.id, {
            vendor: form.vendor || 'VFX Vendor',
            cost: parseFloat(form.cost) || 0,
            delivery_date: form.delivery_date || null,
          })
        } else {
          await createOutsource({
            shot_id: targetShotId,
            vendor: form.vendor || 'VFX Vendor',
            cost: parseFloat(form.cost) || 0,
            delivery_date: form.delivery_date || null,
            status: 'Pending',
          })
        }
      } else {
        if (existingOs) {
          await deleteOutsource(existingOs.id)
        }
      }

      setShowAddShot(false)
      setEditShot(null)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save shot')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteShot(projectId, deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch {
      setError('Failed to delete shot')
    }
  }

  const handleQuickAddVideoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setQuickForm(q => ({
        ...q,
        preview_video_data: ev.target.result,
        preview_video_name: file.name
      }))
    }
    reader.readAsDataURL(file)
  }

  // Quick Add Shot Form
  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!quickForm.shot_name) return
    try {
      const outsourced = parseFloat(quickForm.amount) > 0
      const res = await createShot(projectId, {
        shot_name: quickForm.shot_name,
        task_name: quickForm.task_name || null,
        frame_count: quickForm.frame_count ? parseInt(quickForm.frame_count) : null,
        est_hours: quickForm.est_hours ? parseFloat(quickForm.est_hours) : 0,
        assigned_artist: quickForm.assigned_artist || null,
        status_roto: 'Pending',
        status_paint: 'Pending',
        status_tracking: 'Pending',
        status_cg: 'Pending',
        status_comp: 'Pending',
        outsourced: outsourced,
        preview_link: quickForm.preview_video_data || null,
      })

      const newShot = res.data

      if (outsourced) {
        await createOutsource({
          shot_id: newShot.id,
          vendor: 'Quick Add Vendor',
          cost: parseFloat(quickForm.amount),
          delivery_date: null,
          status: 'Pending',
        })
      }

      setQuickForm({ 
        shot_name: '', 
        task_name: '', 
        frame_count: '', 
        est_hours: '', 
        assigned_artist: '', 
        amount: '', 
        preview_video_data: '', 
        preview_video_name: '' 
      })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to quick add shot')
    }
  }

  // Inline ETA editing
  const handleSaveEta = async () => {
    if (!showEditEta) return
    try {
      await updateShot(projectId, showEditEta.id, { est_hours: parseFloat(etaInput) || 0 })
      setShowEditEta(null)
      load()
    } catch {}
  }

  // Outsource cost entry submit
  const handleSaveOsCost = async () => {
    if (!showOsCost) return
    try {
      await createOutsource({
        shot_id: showOsCost.id,
        vendor: osForm.vendor,
        cost: parseFloat(osForm.cost) || 0,
        delivery_date: osForm.delivery_date || null,
        status: 'Pending',
      })
      await updateShot(projectId, showOsCost.id, { outsourced: true })
      setShowOsCost(null)
      load()
    } catch {}
  }

  // Outsource toggle / untoggle
  const toggleOutsourceStatus = async (shot) => {
    if (shot.outsourced) {
      if (!confirm('Remove outsource cost entries and set this shot as In-house?')) return
      try {
        const matching = outsourceEntries.find(o => o.shot_id === shot.id)
        if (matching) await deleteOutsource(matching.id)
        await updateShot(projectId, shot.id, { outsourced: false })
        load()
      } catch {}
    } else {
      setOsForm({ vendor: '', cost: '', delivery_date: '' })
      setShowOsCost(shot)
    }
  }

  // SheetJS Excel Imports
  const handleExcelImportChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (data.length < 2) {
          setImportPreviewError('No data rows found.')
          return
        }
        const headers = data[0].map(h => String(h).trim().toLowerCase())
        const nameIdx = headers.findIndex(h => h.includes('shot'))
        const framesIdx = headers.findIndex(h => h.includes('frame'))
        const taskIdx = headers.findIndex(h => h.includes('task'))
        const estIdx = headers.findIndex(h => h.includes('hour') || h.includes('est'))
        const artistIdx = headers.findIndex(h => h.includes('assign') || h.includes('artist'))

        if (nameIdx < 0) {
          setImportPreviewError('Could not find "Shot Name" column in Excel sheet.')
          return
        }

        const rows = data.slice(1).filter(r => r[nameIdx] && String(r[nameIdx]).trim())
        const mapped = rows.map(r => ({
          shot_name: String(r[nameIdx]).trim(),
          frame_count: framesIdx >= 0 ? parseInt(r[framesIdx]) || 0 : 0,
          task_name: taskIdx >= 0 ? String(r[taskIdx]).trim() : '',
          est_hours: estIdx >= 0 ? parseFloat(r[estIdx]) || 0 : 0,
          assigned_artist: artistIdx >= 0 ? String(r[artistIdx]).trim() : ''
        }))
        setImportShotsData(mapped)
        setImportPreviewError('')
      } catch (err) {
        setImportPreviewError('Error reading Excel: ' + err.message)
      }
    }
    reader.readAsBinaryString(file)
  }

  const confirmExcelImport = async () => {
    if (!importShotsData.length) return
    setImporting(true)
    let added = 0
    try {
      for (const s of importShotsData) {
        await createShot(projectId, {
          shot_name: s.shot_name,
          frame_count: s.frame_count,
          task_name: s.task_name,
          est_hours: s.est_hours,
          assigned_artist: s.assigned_artist || null,
          status_roto: 'Pending',
          status_paint: 'Pending',
          status_tracking: 'Pending',
          status_cg: 'Pending',
          status_comp: 'Pending',
          outsourced: false,
        })
        added++
      }
      setSuccess(`Successfully imported ${added} shots!`)
      setShowImport(false)
      setImportShotsData([])
      load()
    } catch (err) {
      setError('Import halted: ' + (err.response?.data?.detail || err.message))
    } finally {
      setImporting(false)
    }
  }

  // Details Popup operations
  const openDetailsPopup = async (shot) => {
    setSelectedDetailsShot(shot)
    setDetailsActiveTab('versions')
    setEditingDetailStatus(false)
    setShowDetailAddVersion(false)
    setDetailFeedbackVersion(null)
    
    try {
      const [vRes, fRes, lRes] = await Promise.all([
        getVersions(projectId, shot.id),
        getShotFiles(projectId, shot.id),
        getShotLogs(projectId, shot.id)
      ])
      setDetailsVersions(vRes.data)
      setDetailsFiles(fRes.data)
      setDetailsLogs(lRes.data)
    } catch (err) {
      console.error("Failed to load details data for shot", err)
    }
  }

  const handleRowClick = (e, shot) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('.artist-select-container')) {
      return
    }
    openDetailsPopup(shot)
  }

  const handleDetailSubmitVersion = async (e) => {
    e.preventDefault()
    setSavingDetailVersion(true)
    try {
      await createVersion(projectId, selectedDetailsShot.id, {
        ...detailVersionForm,
        date_sent: detailVersionForm.date_sent || null,
        artist_name: detailVersionForm.artist_name || user.username,
      })
      setShowDetailAddVersion(false)
      setDetailVersionForm({ version_number: '', date_sent: '', artist_name: '', batch_reference: '', delivery_notes: '' })
      const vRes = await getVersions(projectId, selectedDetailsShot.id)
      setDetailsVersions(vRes.data)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit version')
    } finally {
      setSavingDetailVersion(false)
    }
  }

  const handleDetailSaveFeedback = async (e) => {
    e.preventDefault()
    setSavingDetailFeedback(true)
    try {
      await updateVersion(projectId, selectedDetailsShot.id, detailFeedbackVersion.id, {
        ...detailFeedbackForm,
        feedback_date: detailFeedbackForm.feedback_date || null,
      })
      setDetailFeedbackVersion(null)
      const vRes = await getVersions(projectId, selectedDetailsShot.id)
      setDetailsVersions(vRes.data)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save feedback')
    } finally {
      setSavingDetailFeedback(false)
    }
  }

  const handleDetailDeleteVersion = async (vId) => {
    if (!confirm('Are you sure you want to delete this version?')) return
    try {
      await deleteVersion(projectId, selectedDetailsShot.id, vId)
      const vRes = await getVersions(projectId, selectedDetailsShot.id)
      setDetailsVersions(vRes.data)
      load()
    } catch {
      setError('Failed to delete version')
    }
  }

  const openDetailStatusEdit = () => {
    setDetailStatusForm({
      status_roto: selectedDetailsShot.status_roto,
      status_paint: selectedDetailsShot.status_paint,
      status_tracking: selectedDetailsShot.status_tracking,
      status_cg: selectedDetailsShot.status_cg,
      status_comp: selectedDetailsShot.status_comp,
    })
    setEditingDetailStatus(true)
  }

  const saveDetailStatus = async () => {
    setSavingDetailStatus(true)
    try {
      await updateShot(projectId, selectedDetailsShot.id, detailStatusForm)
      setEditingDetailStatus(false)
      const sRes = await getShot(projectId, selectedDetailsShot.id)
      setSelectedDetailsShot(sRes.data)
      load()
    } catch {
      setError('Failed to update statuses')
    } finally {
      setSavingDetailStatus(false)
    }
  }

  // Files & Versions Log operations
  const openFilesModal = async (shot) => {
    setFilesShot(shot)
    setUploadForm({ version: 'v01', note: '' })
    setUploadFileObj(null)
    setShowAddCorrection(false)
    setCorrText('')
    setScreenshotObj(null)
    try {
      const [fRes, lRes] = await Promise.all([
        getShotFiles(projectId, shot.id),
        getShotLogs(projectId, shot.id)
      ])
      setShotFiles(fRes.data)
      setShotLogs(lRes.data)
      // Auto-increment next version
      if (fRes.data.length > 0) {
        const nums = fRes.data.map(f => parseInt(f.version?.replace(/\D/g, '') || '0')).filter(n => !isNaN(n))
        const next = Math.max(...nums, 0) + 1
        setUploadForm(u => ({ ...u, version: `v${String(next).padStart(2, '0')}` }))
      }
    } catch {}
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
    try {
      await uploadShotFile(projectId, filesShot.id, {
        ...uploadFileObj,
        version: uploadForm.version,
        note: uploadForm.note
      })
      setUploadMsg('Uploaded!')
      setUploadFileObj(null)
      setUploadForm(u => ({ ...u, note: '' }))
      const fRes = await getShotFiles(projectId, filesShot.id)
      setShotFiles(fRes.data)
      const next = Math.max(...fRes.data.map(f => parseInt(f.version?.replace(/\D/g, '') || '0')).filter(n => !isNaN(n)), 0) + 1
      setUploadForm(u => ({ ...u, version: `v${String(next).padStart(2, '0')}` }))
      setTimeout(() => setUploadMsg(''), 3000)
    } catch {
      setUploadMsg('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setScreenshotObj({
        screenshot: ev.target.result,
        screenshot_name: file.name
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitCorrection = async () => {
    if (!corrText || !filesShot) return
    try {
      await createShotLog(projectId, filesShot.id, {
        text: corrText,
        ...screenshotObj
      })
      setCorrText('')
      setScreenshotObj(null)
      setShowAddCorrection(false)
      const lRes = await getShotLogs(projectId, filesShot.id)
      setShotLogs(lRes.data)
    } catch {}
  }

  // Calculated shot ETAs
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

  // Month Range string
  function getProjectMonthRange(p) {
    if (!p) return ''
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    let startLabel = ''
    let endLabel = ''
    if (p.start_date) {
      const s = new Date(p.start_date)
      startLabel = MON[s.getMonth()]
    } else {
      startLabel = MON[now.getMonth()]
    }
    if (p.deadline) {
      const e = new Date(p.deadline)
      endLabel = MON[e.getMonth()] + (e.getFullYear() !== now.getFullYear() ? ` ${e.getFullYear()}` : '')
    } else {
      endLabel = MON[now.getMonth()]
    }
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`
  }

  const filtered = shots.filter(s =>
    s.shot_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.sequence || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.assigned_artist || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.task_name || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
  if (!project) return <div className="empty-state"><h3>Project not found</h3></div>

  const doneShots = shots.filter(s => {
    // If every active status is Approved or N/A
    return ['status_roto', 'status_paint', 'status_tracking', 'status_cg', 'status_comp'].every(f => {
      return s[f] === 'Approved' || s[f] === 'N/A'
    })
  }).length
  const pct = shots.length > 0 ? Math.round((doneShots / shots.length) * 100) : 0
  const dl = Math.ceil((new Date(project.deadline) - new Date()) / 86400000)
  const dlStr = isNaN(dl) ? '—' : dl > 0 ? `${dl}d left` : `${Math.abs(dl)}d overdue`
  const dlCol = isNaN(dl) ? 'var(--text-muted)' : dl > 14 ? 'var(--success)' : dl > 0 ? 'var(--warning)' : 'var(--error)'

  const totalSpend = (project.inhouse_cost || 0) + (project.outsource_cost || 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="bc-sep">›</span>
        <span>{project.name}</span>
      </div>

      {/* Advanced Stats Row Layout */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">{project.name}</h1>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 3 }}>
              🏢 {project.client || 'Internal'} {(project.description ? ` — ${project.description}` : '')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              color: 'var(--accent)', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--mono)',
              background: 'rgba(0,212,255,0.08)', padding: '3px 10px', borderRadius: 10,
              border: '1px solid rgba(0,212,255,0.2)'
            }}>{getProjectMonthRange(project)}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}/batches`)}>📦 Batches</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}/feedback`)}>💬 Feedback</button>
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--green)', borderColor: 'rgba(0,229,160,0.3)' }} onClick={() => setShowImport(true)}>⬇ Import Excel</button>
            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--coord)', borderColor: 'rgba(255,159,67,0.4)' }} onClick={downloadShotTemplate}>⬆ Template</button>
            {canAdmin && <button className="btn btn-primary" onClick={openAdd}>+ Add Shot</button>}
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <div className="lbl">Progress</div>
            <div className="val blue">{pct}%</div>
            <div className="sub">{doneShots}/{shots.length} shots done</div>
          </div>
          <div className="stat-box">
            <div className="lbl">Deadline</div>
            <div className="val" style={{ color: dlCol, fontSize: '1.2rem' }}>{dlStr}</div>
          </div>
          {canAdmin && (
            <>
              <div className="stat-box">
                <div className="lbl">In-house Spent</div>
                <div className="val green" style={{ fontSize: '1.2rem' }}>₹{Math.round(project.inhouse_cost || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-box">
                <div className="lbl">Outsource Spent</div>
                <div className="val outsource" style={{ fontSize: '1.2rem' }}>₹{Math.round(project.outsource_cost || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-box">
                <div className="lbl">Total Spend</div>
                <div className="val yellow" style={{ fontSize: '1.2rem' }}>₹{Math.round(totalSpend).toLocaleString('en-IN')}</div>
              </div>
              {project.budget > 0 && (
                <div className="stat-box">
                  <div className="lbl">Budget</div>
                  <div className="val coord" style={{ fontSize: '1.2rem' }}>₹{Math.round(project.budget).toLocaleString('en-IN')}</div>
                  <div className="sub" style={{ color: totalSpend > project.budget ? 'var(--red)' : 'var(--green)', fontSize: '9px', fontWeight: 700 }}>
                    {totalSpend > project.budget ? 'OVER BUDGET' : `Under budget by ₹${Math.round(project.budget - totalSpend).toLocaleString('en-IN')}`}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Overall Progress</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700 }}>{pct}%</span>
        </div>
        <div className="pc-completion-track" style={{ height: 6, background: 'var(--border2)', borderRadius: 3 }}>
          <div className="pc-completion-fill" style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--accent), var(--green))' }} />
        </div>
      </div>

      {/* Inline Quick Add Form (Admins & Coords) */}
      {canAdmin && (
        <div className="card quick-add-card" style={{ marginBottom: 20, padding: '10px 14px' }}>
          <form onSubmit={handleQuickAdd} className="quick-add-form">
            <span className="quick-add-label">⏱ Quick Add Shot:</span>
            <input className="form-control quick-add-field" style={{ flex: '2 1 120px' }} value={quickForm.shot_name} onChange={e => setQuickForm(q => ({ ...q, shot_name: e.target.value }))} placeholder="Shot Name" required />
            <div className="quick-add-field" style={{ flex: '1.5 1 110px' }}>
              <TaskSelectDropdown value={quickForm.task_name} onChange={val => setQuickForm(q => ({ ...q, task_name: val }))} />
            </div>
            <input className="form-control quick-add-field" style={{ flex: '1 1 80px' }} type="number" value={quickForm.frame_count} onChange={e => setQuickForm(q => ({ ...q, frame_count: e.target.value }))} placeholder="Frames" />
            <input className="form-control quick-add-field" style={{ flex: '1 1 80px' }} type="number" step="0.5" value={quickForm.est_hours} onChange={e => setQuickForm(q => ({ ...q, est_hours: e.target.value }))} placeholder="Est. Hrs" />
            <input className="form-control quick-add-field" style={{ flex: '1 1 90px' }} type="number" value={quickForm.amount} onChange={e => setQuickForm(q => ({ ...q, amount: e.target.value }))} placeholder="Cost ₹" min="0" />
            <label className="quick-add-file-btn quick-add-field quick-add-file" style={{ flex: '1.5 1 120px' }} title={quickForm.preview_video_name || 'Attach video'}>
              <input type="file" accept="video/*" onChange={handleQuickAddVideoChange} style={{ display: 'none' }} />
              {quickForm.preview_video_name
                ? <><span className="quick-add-file-icon">🎬</span><span className="quick-add-file-name">{quickForm.preview_video_name}</span></>
                : <><span className="quick-add-file-icon">📎</span><span>Attach Video</span></>}
            </label>
            <div className="quick-add-field" style={{ flex: '2 1 150px' }}>
              <ArtistSelectDropdown
                selectedArtists={quickForm.assigned_artist ? quickForm.assigned_artist.split(',').map(a => a.trim()).filter(Boolean) : []}
                users={users}
                onChange={val => setQuickForm(q => ({ ...q, assigned_artist: val }))}
              />
            </div>
            <button className="quick-add-submit" type="submit">+ Add Shot</button>
          </form>
        </div>
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
            <span>{t.type === 'error' ? '✕' : '✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Toolbar Search */}
      <div className="shots-toolbar">
        <input
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder="Search shots, tasks, artists…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="text-dim" style={{ fontSize: '0.8rem' }}>
          {filtered.length} of {shots.length} shots shown
        </span>
      </div>

      {/* Upgraded Table List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎞</div>
          <h3>No shots found</h3>
          <p>Add shots above or upload an Excel sheet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: 52 }}></th>
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
                {filtered.map(shot => {
                  const isOutsourced = shot.outsourced
                  const outsource = outsourceEntries.find(o => o.shot_id === shot.id)
                  
                  return (
                    <tr key={shot.id} 
                      onClick={(e) => handleRowClick(e, shot)} 
                      style={{ cursor: 'pointer', background: isOutsourced ? 'rgba(245,158,11,0.02)' : undefined, borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '6px 8px', width: 52 }}>
                        <div
                          className="shot-thumb"
                          onClick={e => { e.stopPropagation(); shot.preview_link && setLightboxSrc(shot.preview_link) }}
                          title={shot.preview_link ? 'Click to preview' : 'No preview'}
                        >
                          {shot.preview_link
                            ? <img src={shot.preview_link} alt={shot.shot_name} className="shot-thumb-img" />
                            : <span className="shot-thumb-empty">🎞</span>}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        <button className="shot-name-link" onClick={(e) => { e.preventDefault(); openDetailsPopup(shot); }}>
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
                          <button className="btn btn-secondary btn-sm" onClick={() => openFilesModal(shot)} title="Files & Versions Log">📂 Files</button>
                          {canAdmin && (
                            <>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', borderColor: 'rgba(0,212,255,0.3)' }} onClick={() => openEdit(shot)} title="Edit Shot">✏️ Edit</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => { setEtaInput(shot.est_hours || ''); setShowEditEta(shot) }} title="Edit Est. Hours">⏰</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--outsource)', borderColor: 'rgba(245,158,11,0.3)' }} onClick={() => toggleOutsourceStatus(shot)} title={isOutsourced ? 'Set as In-house' : 'Set as Outsourced'}>
                                {isOutsourced ? '🏠' : '📤'}
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(shot)} title="Delete">🗑</button>
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
      )}

      {/* Add / Edit Shot Modal */}
      {(showAddShot || editShot) && (
        <Modal
          title={editShot ? `Edit ${editShot.shot_name}` : 'Add Shot'}
          onClose={() => { setShowAddShot(false); setEditShot(null); setShotFileObj(null) }}
          size="modal-lg"
        >
          <form onSubmit={handleSave}>
            <div className="grid-2">
              {/* Shot Name */}
              <div className="form-group">
                <label className="form-label">Shot Name *</label>
                <input className="form-control" value={form.shot_name}
                  onChange={e => setForm(f => ({ ...f, shot_name: e.target.value }))}
                  placeholder="e.g. SH_0010" required autoFocus />
              </div>

              {/* Frame Count */}
              <div className="form-group">
                <label className="form-label">Frame Count</label>
                <input className="form-control" type="number" value={form.frame_count}
                  onChange={e => setForm(f => ({ ...f, frame_count: e.target.value }))}
                  placeholder="e.g. 120" />
              </div>

              {/* Task — custom dropdown + free-type fallback */}
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

              {/* Est. Hours */}
              <div className="form-group">
                <label className="form-label">Estimated Hours</label>
                <input className="form-control" type="number" step="0.5" value={form.est_hours}
                  onChange={e => setForm(f => ({ ...f, est_hours: e.target.value }))}
                  placeholder="e.g. 8" />
              </div>

              {/* Assigned Artist */}
              <div className="form-group">
                <label className="form-label">Assigned Artist</label>
                <ArtistSelectDropdown
                  selectedArtists={form.assigned_artist ? form.assigned_artist.split(',').map(a => a.trim()).filter(Boolean) : []}
                  users={users}
                  onChange={val => setForm(f => ({ ...f, assigned_artist: val }))}
                />
              </div>

              {/* Assignment Type */}
              <div className="form-group">
                <label className="form-label">Assignment Type</label>
                <StatusSelectDropdown
                  label="Type"
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
                    <input className="form-control" value={form.vendor}
                      onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                      placeholder="e.g. VFX Vendor" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Outsource Cost (₹) *</label>
                    <input className="form-control" type="number" value={form.cost}
                      onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                      placeholder="e.g. 15000" min="0" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Date</label>
                    <input className="form-control" type="date" value={form.delivery_date}
                      onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
                  </div>
                </>
              )}

              {/* Shot Path + Drive — full-width combined section */}
              <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Shot Path row */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)', background: 'var(--surface)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Shot Path</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-control"
                      style={{ flex: 1 }}
                      value={form.shot_path}
                      onChange={e => setForm(f => ({ ...f, shot_path: e.target.value }))}
                      placeholder="/Volumes/Projects/SH_0010.mov"
                    />
                    <label className="btn btn-secondary" style={{ whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      📁 Browse
                      <input type="file" accept="video/*" style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setShotFileObj(file)
                            setForm(f => ({ ...f, shot_path: file.name }))
                          }
                        }} />
                    </label>
                  </div>
                  {shotFileObj && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>✓</span>
                      <span>{shotFileObj.name}</span>
                      <span style={{ color: 'var(--muted)' }}>({(shotFileObj.size / 1024 / 1024).toFixed(1)} MB)</span>
                      <button type="button" onClick={() => { setShotFileObj(null); setForm(f => ({ ...f, shot_path: '' })) }}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, marginLeft: 2 }}>✕</button>
                    </div>
                  )}
                </div>

                {/* Google Drive row */}
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Google Drive <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)', fontSize: 10 }}>(optional)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-control"
                      style={{ flex: 1 }}
                      value={form.drive_link}
                      onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))}
                      placeholder="Paste Drive link…"
                    />
                    <button
                      type="button"
                      disabled={!shotFileObj}
                      onClick={() => alert('Google Drive upload — coming soon!')}
                      style={{
                        padding: '0 16px', borderRadius: 8, border: '1px solid',
                        fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', cursor: shotFileObj ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        background: shotFileObj ? 'rgba(66,133,244,0.12)' : 'transparent',
                        color: shotFileObj ? '#4285f4' : 'var(--muted)',
                        borderColor: shotFileObj ? 'rgba(66,133,244,0.4)' : 'var(--border2)',
                      }}
                    >
                      ☁ Upload to Drive
                    </button>
                  </div>
                  {!shotFileObj && (
                    <div style={{ marginTop: 5, fontSize: 11, color: 'var(--muted)' }}>Browse a file above to enable upload</div>
                  )}
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
              <button type="button" className="btn btn-secondary" onClick={() => { setShowAddShot(false); setEditShot(null); setShotFileObj(null) }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : editShot ? 'Save Changes' : 'Add Shot'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Preview lightbox */}
      {lightboxSrc && (
        <div className="lightbox-overlay" onClick={() => setLightboxSrc(null)}>
          <div className="lightbox-box" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
            {lightboxSrc.startsWith('data:video') || lightboxSrc.includes('.mp4') || lightboxSrc.includes('.mov') ? (
              <video src={lightboxSrc} controls autoPlay className="lightbox-media" />
            ) : (
              <img src={lightboxSrc} alt="Preview" className="lightbox-media" />
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete Shot" onClose={() => setDeleteTarget(null)}>
          <p>Delete <strong>{deleteTarget.shot_name}</strong>? All versions and feedback will be removed.</p>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete Shot</button>
          </div>
        </Modal>
      )}

      {/* Edit ETA Inline Modal */}
      {showEditEta && (
        <Modal title="Edit Estimated Hours" onClose={() => setShowEditEta(null)}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: 14 }}>Shot: {showEditEta.shot_name}</div>
          <div className="form-group">
            <label className="form-label">Estimated Hours</label>
            <input className="form-control" type="number" step="0.5" value={etaInput} onChange={e => setEtaInput(e.target.value)} placeholder="e.g. 12" />
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowEditEta(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveEta}>Save</button>
          </div>
        </Modal>
      )}

      {/* Set Outsource Cost Modal */}
      {showOsCost && (
        <Modal title="Record Outsource Cost" onClose={() => setShowOsCost(null)}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: 14 }}>Shot: {showOsCost.shot_name}</div>
          <div className="form-group">
            <label className="form-label">Vendor Name *</label>
            <input className="form-control" value={osForm.vendor} onChange={e => setOsForm(o => ({ ...o, vendor: e.target.value }))} placeholder="VFX Vendor Studio" required />
          </div>
          <div className="form-group mt-3">
            <label className="form-label">Outsource Cost (₹) *</label>
            <input className="form-control" type="number" value={osForm.cost} onChange={e => setOsForm(o => ({ ...o, cost: e.target.value }))} placeholder="e.g. 25000" min="0" required />
          </div>
          <div className="form-group mt-3">
            <label className="form-label">Delivery Date</label>
            <input className="form-control" type="date" value={osForm.delivery_date} onChange={e => setOsForm(o => ({ ...o, delivery_date: e.target.value }))} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowOsCost(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveOsCost}>Save Cost</button>
          </div>
        </Modal>
      )}

      {/* Excel SheetJS Import Preview Modal */}
      {showImport && (
        <Modal title="Import Shots from Excel" onClose={() => setShowImport(false)} size="modal-lg">
          <div style={{ background: 'rgba(255,159,67,0.06)', border: '1px solid rgba(255,159,67,0.2)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '12px', color: 'var(--coord)' }}>
            Excel columns required: <strong>Shot Name, Frames, Task, Est. Hours, Assigned To</strong>. Download the sample template above to get started.
          </div>
          <div className="form-group">
            <label className="form-label">Upload Excel File (.xlsx)</label>
            <input className="form-control" type="file" accept=".xlsx" onChange={handleExcelImportChange} />
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
            <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={confirmExcelImport} disabled={importing || !importShotsData.length}>
              {importing ? 'Importing…' : 'Import Shots'}
            </button>
          </div>
        </Modal>
      )}

      {/* Files & Versions log Modal */}
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
                    <input className="form-control" value={uploadForm.note} onChange={e => setUploadForm(u => ({ ...u, note: e.target.value }))} placeholder="Comp roto pass" />
                  </div>
                </div>
                <input className="form-control" type="file" onChange={handleShotFileChange} required />
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

            {/* Quick add correction */}
            {showAddCorrection && (
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--surface)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10 }}>
                <div className="form-group">
                  <label className="form-label">Note / Correction text *</label>
                  <textarea className="form-control" rows={2} value={corrText} onChange={e => setCorrText(e.target.value)} placeholder="Describe correction needed…" required />
                </div>
                <div className="form-group mt-2">
                  <label className="form-label">Attach Screenshot (optional)</label>
                  <input className="form-control" type="file" accept="image/*" onChange={handleScreenshotChange} />
                </div>
                <div className="modal-footer" style={{ padding: 0, marginTop: 12, border: 'none' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddCorrection(false)}>Cancel</button>
                  <button className="btn btn-danger btn-sm" onClick={handleSubmitCorrection}>Save Note</button>
                </div>
              </div>
            )}

            {/* Logs List */}
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

      {/* Premium Shot Details Dashboard Modal */}
      {selectedDetailsShot && (
        <Modal 
          title={`Shot Dashboard — ${selectedDetailsShot.shot_name}`} 
          onClose={() => setSelectedDetailsShot(null)} 
          size="modal-xl"
        >
          <div className="shot-popup-grid">
            {/* Left Column: Sidebar details */}
            <div className="shot-popup-sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontWeight: 700 }}>Shot Overview</span>
                <h2 style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>{selectedDetailsShot.shot_name}</h2>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {selectedDetailsShot.sequence && <span className="badge badge-secondary">{selectedDetailsShot.sequence}</span>}
                  {selectedDetailsShot.task_name && <span className="badge badge-purple">{selectedDetailsShot.task_name}</span>}
                  {selectedDetailsShot.frame_count && <span className="badge badge-yellow">{selectedDetailsShot.frame_count} frames</span>}
                </div>
              </div>

              <div className="divider" style={{ margin: '10px 0' }} />

              {/* Assignment Type badge */}
              <div className="shot-meta-card">
                <div className="title">Assignment Type</div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                  {selectedDetailsShot.outsourced ? (
                    <span className="badge badge-outsource" style={{ fontSize: '11px', padding: '4px 10px' }}>📤 Outsourced</span>
                  ) : (
                    <span className="badge badge-blue" style={{ fontSize: '11px', padding: '4px 10px' }}>🏠 In-house</span>
                  )}
                </div>
              </div>

              {/* Assigned Artists */}
              <div className="shot-meta-card">
                <div className="title">Assigned Artist(s)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {!selectedDetailsShot.assigned_artist ? (
                    <span className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>Unassigned</span>
                  ) : (
                    selectedDetailsShot.assigned_artist.split(',').map(name => {
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

              {/* Estimated vs Logged Hours Progress */}
              {!selectedDetailsShot.outsourced && (
                <div className="shot-meta-card">
                  <div className="title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hours Tracker</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>{selectedDetailsShot.logged_hours || 0}h / {selectedDetailsShot.est_hours || 0}h</span>
                  </div>
                  {(() => {
                    const est = selectedDetailsShot.est_hours || 0
                    const logged = selectedDetailsShot.logged_hours || 0
                    if (est <= 0) return <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 4 }}>No estimated hours recorded</div>
                    const pct = Math.min(Math.round((logged / est) * 100), 100)
                    const over = logged > est
                    const barColor = over ? 'var(--red)' : pct >= 90 ? 'var(--yellow)' : 'var(--green)'
                    return (
                      <div style={{ marginTop: 6 }}>
                        <div className="popup-eta-progress">
                          <div className="popup-eta-fill" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: over ? 'var(--red)' : 'var(--muted)', fontWeight: 700, marginTop: 2 }}>
                          <span>{pct}% Consumed</span>
                          <span>{over ? 'OVER BUDGET' : `${(est - logged).toFixed(1)}h remaining`}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Outsourcing panel if outsourced */}
              {selectedDetailsShot.outsourced && (
                <div className="shot-meta-card" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.02)' }}>
                  <div className="title" style={{ color: 'var(--outsource)' }}>Outsource Contracts</div>
                  {(() => {
                    const os = outsourceEntries.find(o => o.shot_id === selectedDetailsShot.id)
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

              {/* Links Action */}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {selectedDetailsShot.folder_link ? (
                  <a href={selectedDetailsShot.folder_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>📁 Drive Folder</a>
                ) : (
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', opacity: 0.5 }} disabled>📁 No Folder Link</button>
                )}
                {selectedDetailsShot.preview_link ? (
                  <a href={selectedDetailsShot.preview_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>▶ Play Preview</a>
                ) : (
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', opacity: 0.5 }} disabled>▶ No Preview</button>
                )}
              </div>
            </div>

            {/* Right Column: Interactive Tabs and Pipeline */}
            <div>
              {/* Pipeline Status */}
              <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontWeight: 700 }}>Department Statuses</span>
                  {canAdmin && !editingDetailStatus && (
                    <button className="btn btn-ghost btn-sm" onClick={openDetailStatusEdit}>✏ Edit</button>
                  )}
                  {editingDetailStatus && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingDetailStatus(false)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={saveDetailStatus} disabled={savingDetailStatus}>Save</button>
                    </div>
                  )}
                </div>

                {editingDetailStatus ? (
                  <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {[
                      { key: 'status_roto', label: 'Roto' },
                      { key: 'status_paint', label: 'Paint' },
                      { key: 'status_tracking', label: 'Tracking' },
                      { key: 'status_cg', label: 'CG' },
                      { key: 'status_comp', label: 'Comp' },
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
                      { label: 'Roto', val: selectedDetailsShot.status_roto },
                      { label: 'Paint', val: selectedDetailsShot.status_paint },
                      { label: 'Tracking', val: selectedDetailsShot.status_tracking },
                      { label: 'CG', val: selectedDetailsShot.status_cg },
                      { label: 'Comp', val: selectedDetailsShot.status_comp },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: '60px' }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>{label}</span>
                        <DeptBadge status={val} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab Header bar */}
              <div className="details-tab-bar">
                <button 
                  className={`details-tab-btn ${detailsActiveTab === 'versions' ? 'active' : ''}`}
                  onClick={() => setDetailsActiveTab('versions')}
                >
                  🎞 Versions ({detailsVersions.length})
                </button>
                <button 
                  className={`details-tab-btn ${detailsActiveTab === 'files' ? 'active' : ''}`}
                  onClick={() => setDetailsActiveTab('files')}
                >
                  📂 Files ({detailsFiles.length})
                </button>
                <button 
                  className={`details-tab-btn ${detailsActiveTab === 'corrections' ? 'active' : ''}`}
                  onClick={() => setDetailsActiveTab('corrections')}
                >
                  📝 Corrections ({detailsLogs.length})
                </button>
              </div>

              {/* Tab Content Panel */}
              <div className="tab-pane-content">
                {/* ── VERSIONS TAB ── */}
                {detailsActiveTab === 'versions' && (
                  <div>
                    {/* Add Version Trigger & Form */}
                    <div style={{ marginBottom: 14 }}>
                      {!showDetailAddVersion ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setDetailVersionForm({ version_number: nextDetailVersionNumber(), date_sent: new Date().toISOString().split('T')[0], artist_name: user.username, batch_reference: '', delivery_notes: '' }); setShowDetailAddVersion(true) }}>
                          + Submit New Version
                        </button>
                      ) : (
                        <div style={{ padding: '14px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--surface)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12 }}>Submit Version</div>
                          <form onSubmit={handleDetailSubmitVersion}>
                            <div className="grid-2">
                              <div className="form-group">
                                <label className="form-label">Version Number *</label>
                                <input className="form-control" value={detailVersionForm.version_number} onChange={e => setDetailVersionForm(v => ({ ...v, version_number: e.target.value }))} placeholder="v01" required />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Date Sent</label>
                                <input className="form-control" type="date" value={detailVersionForm.date_sent} onChange={e => setDetailVersionForm(v => ({ ...v, date_sent: e.target.value }))} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Artist Name</label>
                                <input className="form-control" value={detailVersionForm.artist_name} onChange={e => setDetailVersionForm(v => ({ ...v, artist_name: e.target.value }))} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Batch Reference</label>
                                <input className="form-control" value={detailVersionForm.batch_reference} onChange={e => setDetailVersionForm(v => ({ ...v, batch_reference: e.target.value }))} placeholder="BATCH_01" />
                              </div>
                            </div>
                            <div className="form-group mt-2">
                              <label className="form-label">Delivery Notes</label>
                              <textarea className="form-control" rows={2} value={detailVersionForm.delivery_notes} onChange={e => setDetailVersionForm(v => ({ ...v, delivery_notes: e.target.value }))} placeholder="Version notes..." />
                            </div>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDetailAddVersion(false)}>Cancel</button>
                              <button type="submit" className="btn btn-primary btn-sm" disabled={savingDetailVersion}>Submit</button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Edit Feedback Sub-Modal */}
                    {detailFeedbackVersion && (
                      <div style={{ padding: '14px', border: '1px solid rgba(255,159,67,0.2)', borderRadius: 10, background: 'var(--surface)', marginBottom: 14 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--coord)', textTransform: 'uppercase', marginBottom: 12 }}>Update Feedback — {detailFeedbackVersion.version_number}</div>
                        <form onSubmit={handleDetailSaveFeedback}>
                          <div className="grid-2">
                            <div className="form-group">
                              <label className="form-label">Feedback Status</label>
                              <select className="form-control" value={detailFeedbackForm.feedback_status} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_status: e.target.value }))}>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Changes Required">Changes Required</option>
                                <option value="No Feedback">No Feedback</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Task Status</label>
                              <select className="form-control" value={detailFeedbackForm.task_status} onChange={e => setDetailFeedbackForm(f => ({ ...f, task_status: e.target.value }))}>
                                <option value="Pending">Pending</option>
                                <option value="WIP">WIP</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Approved">Approved</option>
                                <option value="Changes Req.">Changes Req.</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Feedback Date</label>
                              <input className="form-control" type="date" value={detailFeedbackForm.feedback_date} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_date: e.target.value }))} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Feedback Image URL</label>
                              <input className="form-control" value={detailFeedbackForm.feedback_image} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_image: e.target.value }))} placeholder="https://..." />
                            </div>
                          </div>
                          <div className="form-group mt-2">
                            <label className="form-label">Feedback Detail</label>
                            <textarea className="form-control" rows={2} value={detailFeedbackForm.feedback_detail} onChange={e => setDetailFeedbackForm(f => ({ ...f, feedback_detail: e.target.value }))} placeholder="Client feedback detail..." />
                          </div>
                          <div className="form-group mt-2">
                            <label className="form-label">Action Required</label>
                            <textarea className="form-control" rows={2} value={detailFeedbackForm.action_required} onChange={e => setDetailFeedbackForm(f => ({ ...f, action_required: e.target.value }))} placeholder="Fixes required..." />
                          </div>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailFeedbackVersion(null)}>Cancel</button>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={savingDetailFeedback}>Save</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Versions list */}
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
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: '10px' }} onClick={() => { setDetailFeedbackVersion(v); setDetailFeedbackForm({ feedback_status: v.feedback_status, feedback_date: v.feedback_date || '', feedback_detail: v.feedback_detail || '', action_required: v.action_required || '', task_status: v.task_status, feedback_image: v.feedback_image || '' }) }}>Feedback</button>
                                {canAdmin && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '3px 6px', fontSize: '10px' }} onClick={() => handleDetailDeleteVersion(v.id)}>🗑</button>}
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

                {/* ── FILES TAB ── */}
                {detailsActiveTab === 'files' && (
                  <div>
                    {/* Add File inline form */}
                    <div style={{ marginBottom: 14, padding: 12, border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--surface)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 10 }}>Upload File Version</div>
                      <form onSubmit={async (e) => {
                        e.preventDefault()
                        if (!uploadFileObj) return
                        setUploading(true)
                        try {
                          await uploadShotFile(projectId, selectedDetailsShot.id, {
                            ...uploadFileObj,
                            version: uploadForm.version,
                            note: uploadForm.note
                          })
                          setUploadMsg('Uploaded successfully!')
                          setUploadFileObj(null)
                          setUploadForm(u => ({ ...u, note: '' }))
                          const fRes = await getShotFiles(projectId, selectedDetailsShot.id)
                          setDetailsFiles(fRes.data)
                          const next = Math.max(...fRes.data.map(f => parseInt(f.version?.replace(/\D/g, '') || '0')).filter(n => !isNaN(n)), 0) + 1
                          setUploadForm(u => ({ ...u, version: `v${String(next).padStart(2, '0')}` }))
                          load()
                          setTimeout(() => setUploadMsg(''), 3000)
                        } catch {
                          setUploadMsg('Upload failed.')
                        } finally {
                          setUploading(false)
                        }
                      }}>
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
                          <input className="form-control" style={{ padding: '6px', fontSize: '12px', flex: 1 }} type="file" onChange={handleShotFileChange} required />
                          <button className="btn btn-primary btn-sm" type="submit" disabled={uploading || !uploadFileObj}>Upload</button>
                        </div>
                        {uploadMsg && <div style={{ fontSize: '11px', marginTop: 6, color: uploadMsg.includes('fail') ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{uploadMsg}</div>}
                      </form>
                    </div>

                    {/* Files list */}
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
                            {f.data && (
                              <a href={f.data} download={f.name} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>↓</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CORRECTIONS TAB ── */}
                {detailsActiveTab === 'corrections' && (
                  <div>
                    {/* Add Correction trigger/form */}
                    <div style={{ marginBottom: 14 }}>
                      {!showAddCorrection ? (
                        <button className="btn btn-danger btn-sm" onClick={() => setShowAddCorrection(true)}>+ Add Correction Note</button>
                      ) : (
                        <div style={{ padding: '14px', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, background: 'var(--surface)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 12 }}>New Correction Log</div>
                          <form onSubmit={async (e) => {
                            e.preventDefault()
                            if (!corrText) return
                            try {
                              await createShotLog(projectId, selectedDetailsShot.id, {
                                text: corrText,
                                ...screenshotObj
                              })
                              setCorrText('')
                              setScreenshotObj(null)
                              setShowAddCorrection(false)
                              const lRes = await getShotLogs(projectId, selectedDetailsShot.id)
                              setDetailsLogs(lRes.data)
                              load()
                            } catch {}
                          }}>
                            <div className="form-group">
                              <label className="form-label">Note / Correction text *</label>
                              <textarea className="form-control" rows={2} value={corrText} onChange={e => setCorrText(e.target.value)} placeholder="Describe correction needed…" required />
                            </div>
                            <div className="form-group mt-2">
                              <label className="form-label">Attach Screenshot (optional)</label>
                              <input className="form-control" type="file" accept="image/*" onChange={handleScreenshotChange} />
                            </div>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddCorrection(false)}>Cancel</button>
                              <button type="submit" className="btn btn-danger btn-sm">Save Log</button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Correction list */}
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
            <button className="btn btn-secondary" onClick={() => setSelectedDetailsShot(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
