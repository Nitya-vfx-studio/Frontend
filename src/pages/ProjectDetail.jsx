import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getProject, getShots, createShot, updateShot, deleteShot,
  getShotFiles, uploadShotFile, getShotLogs, createShotLog,
  getOutsource, createOutsource, deleteOutsource, updateOutsource,
  getVersions, createVersion, updateVersion, deleteVersion, getShot,
  getThumbnailUploadUrl, confirmThumbnail,
  getShotFileUploadUrl, getLogScreenshotUploadUrl,
} from '../api'
import Modal from '../components/Modal'
import { ArtistSelectDropdown, StatusSelectDropdown, TaskSelectDropdown, DEPT_STATUSES, TASK_OPTIONS } from '../components/dropdowns'
import { useAuth } from '../hooks/useAuth'
import { useUsers } from '../hooks/useUsers'
import { isOwner } from '../utils/permissions'
import { generateThumbnailBlob } from '../utils/thumbnail'
import { downloadShotTemplate, parseShotsWorkbook } from '../utils/shotTemplate'
import { uploadToStorage } from '../utils/storage'
import { ShotsTable } from '../components/projectDetail/ShotsTable'
import { ShotsGrid } from '../components/projectDetail/ShotsGrid'
import { AddEditShotModal } from '../components/projectDetail/AddEditShotModal'
import { ImportShotsModal } from '../components/projectDetail/ImportShotsModal'
import { FilesCorrectionsModal } from '../components/projectDetail/FilesCorrectionsModal'
import { ShotDetailsModal } from '../components/projectDetail/ShotDetailsModal'
import './ProjectDetail.css'

const EMPTY_SHOT = {
  shot_name: '', frame_count: '',
  assigned_artist: '', shot_path: '', drive_link: '',
  status_roto: 'Pending', status_paint: 'Pending',
  status_tracking: 'Pending', status_cg: 'Pending', status_comp: 'Pending',
  est_hours: '', outsourced: false, task_name: '',
}


export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()
  const thumbHoverTimer = useRef(null)
  const [thumbnailModalSrc, setThumbnailModalSrc] = useState(null)
  const [hoveredThumb, setHoveredThumb] = useState(null) // { url, rect }

  const { user } = useAuth()
  const { users } = useUsers({ activeOnly: true })
  const [project, setProject] = useState(null)
  const [shots, setShots] = useState([])
  const [outsourceEntries, setOutsourceEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid')

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
  const [quickForm, setQuickForm] = useState({ shot_name: '', task_name: '', frame_count: '', est_hours: '', assigned_artist: '', amount: '', video_file: null, video_file_name: '' })

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
  
  // Thumbnail upload tracking (Set of shot IDs currently being processed)
  const [uploadingThumbs, setUploadingThumbs] = useState(new Set())

  // Correction logs
  const [showAddCorrection, setShowAddCorrection] = useState(false)
  const [corrText, setCorrText] = useState('')
  const [screenshotObj, setScreenshotObj] = useState(null)

  const canAdmin = ['coordinator', 'admin'].includes(user?.role)

  const load = async () => {
    try {
      setLoading(true)
      const [pRes, sRes, osRes] = await Promise.all([
        getProject(projectId),
        getShots(projectId),
        getOutsource({ project_id: projectId }),
      ])
      setProject(pRes.data)
      setShots(sRes.data)
      setOutsourceEntries(osRes.data)
    } catch {
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  // Warn user if thumbnails are mid-upload and they try to close/navigate away
  useEffect(() => {
    const handler = (e) => {
      if (uploadingThumbs.size > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [uploadingThumbs])

  // ── Thumbnail helpers ──────────────────────────────────────────────────────

  async function processThumbnailForShot(shotId, videoFile) {
    setUploadingThumbs(prev => new Set([...prev, shotId]))
    try {
      const blob = await generateThumbnailBlob(videoFile)
      const key = await uploadToStorage(blob, () => getThumbnailUploadUrl(projectId, shotId))
      await confirmThumbnail(projectId, shotId, key)
      const { data: updated } = await getShot(projectId, shotId)
      setShots(prev => prev.map(s => s.id === shotId ? updated : s))
    } catch (err) {
      console.error('Thumbnail generation failed:', err)
    } finally {
      setUploadingThumbs(prev => { const n = new Set(prev); n.delete(shotId); return n })
    }
  }

  function startThumbHoverTimer(url, el) {
    clearTimeout(thumbHoverTimer.current)
    thumbHoverTimer.current = setTimeout(() => {
      setHoveredThumb({ url, rect: el.getBoundingClientRect() })
    }, 1000)
  }

  function clearThumbHover() {
    clearTimeout(thumbHoverTimer.current)
    setHoveredThumb(null)
  }

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
      const videoFile = shotFileObj
      let finalPreviewLink = form.drive_link || null

      if (form.upload_to_drive) {
        if (!videoFile) {
          setError('Please select/browse a local video file to upload to Drive.')
          setSaving(false)
          return
        }
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        finalPreviewLink = `https://drive.google.com/file/d/mock_${Math.random().toString(36).substring(2, 10)}/view`
      }

      const payload = {
        ...form,
        frame_count: form.frame_count ? parseInt(form.frame_count) : null,
        est_hours: form.est_hours ? parseFloat(form.est_hours) : 0,
        folder_link: form.shot_path || null,
        preview_link: finalPreviewLink,
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
      setShotFileObj(null)
      load()
      if (videoFile) processThumbnailForShot(savedShot.id, videoFile)
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
    setQuickForm(q => ({ ...q, video_file: file, video_file_name: file.name }))
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

      const videoFile = quickForm.video_file
      setQuickForm({ shot_name: '', task_name: '', frame_count: '', est_hours: '', assigned_artist: '', amount: '', video_file: null, video_file_name: '' })
      load()
      if (videoFile) processThumbnailForShot(newShot.id, videoFile)
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

  // Inline status update
  const handleUpdateStatus = async (shotId, field, value) => {
    try {
      await updateShot(projectId, shotId, { [field]: value })
      load()
      setSuccess('Status updated successfully')
    } catch (err) {
      setError('Failed to update status')
    }
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
    reader.onload = async (ev) => {
      try {
        const result = await parseShotsWorkbook(ev.target.result)
        if (result.error) {
          setImportPreviewError(result.error)
          return
        }
        setImportShotsData(result.rows)
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

  const nextVersionLabel = (files) => {
    const next = Math.max(0, ...files.map(f => parseInt(f.version?.replace(/\D/g, '') || '0')).filter(n => !isNaN(n))) + 1
    return `v${String(next).padStart(2, '0')}`
  }

  // Picks a File for upload (no base64 — the bytes go straight to object storage on submit).
  const handleShotFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFileObj({ file, name: file.name, size: file.size, type: file.type })
  }

  // Shared: presign → PUT to storage → register the file row by key.
  const uploadPickedFileToShot = async (shotId, fileObj, version, note) => {
    const key = await uploadToStorage(fileObj.file, () => getShotFileUploadUrl(projectId, shotId, fileObj.name, fileObj.type))
    await uploadShotFile(projectId, shotId, {
      name: fileObj.name, size: fileObj.size, type: fileObj.type,
      storage_key: key, version, note,
    })
  }

  // Shared: presign + upload the optional screenshot, then create the correction log.
  const submitCorrectionToShot = async (shotId, text, ss) => {
    const payload = { text }
    if (ss?.file) {
      const key = await uploadToStorage(ss.file, () => getLogScreenshotUploadUrl(projectId, shotId, ss.screenshot_name, ss.file.type))
      payload.screenshot_key = key
      payload.screenshot_name = ss.screenshot_name
    }
    await createShotLog(projectId, shotId, payload)
  }

  const handleUploadShotFile = async (e) => {
    e.preventDefault()
    if (!uploadFileObj || !filesShot) return
    setUploading(true)
    try {
      await uploadPickedFileToShot(filesShot.id, uploadFileObj, uploadForm.version, uploadForm.note)
      setUploadMsg('Uploaded!')
      setUploadFileObj(null)
      setUploadForm(u => ({ ...u, note: '' }))
      const fRes = await getShotFiles(projectId, filesShot.id)
      setShotFiles(fRes.data)
      setUploadForm(u => ({ ...u, version: nextVersionLabel(fRes.data) }))
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
    setScreenshotObj({ file, screenshot_name: file.name })
  }

  const handleSubmitCorrection = async () => {
    if (!corrText || !filesShot) return
    try {
      await submitCorrectionToShot(filesShot.id, corrText, screenshotObj)
      setCorrText('')
      setScreenshotObj(null)
      setShowAddCorrection(false)
      const lRes = await getShotLogs(projectId, filesShot.id)
      setShotLogs(lRes.data)
    } catch {}
  }

  // Details-drawer variants (refresh the drawer's own lists + project stats).
  const handleDetailUploadFile = async (e) => {
    e.preventDefault()
    if (!uploadFileObj || !selectedDetailsShot) return
    setUploading(true)
    try {
      await uploadPickedFileToShot(selectedDetailsShot.id, uploadFileObj, uploadForm.version, uploadForm.note)
      setUploadMsg('Uploaded successfully!')
      setUploadFileObj(null)
      setUploadForm(u => ({ ...u, note: '' }))
      const fRes = await getShotFiles(projectId, selectedDetailsShot.id)
      setDetailsFiles(fRes.data)
      setUploadForm(u => ({ ...u, version: nextVersionLabel(fRes.data) }))
      load()
      setTimeout(() => setUploadMsg(''), 3000)
    } catch {
      setUploadMsg('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDetailSubmitCorrection = async (e) => {
    e.preventDefault()
    if (!corrText || !selectedDetailsShot) return
    try {
      await submitCorrectionToShot(selectedDetailsShot.id, corrText, screenshotObj)
      setCorrText('')
      setScreenshotObj(null)
      setShowAddCorrection(false)
      const lRes = await getShotLogs(projectId, selectedDetailsShot.id)
      setDetailsLogs(lRes.data)
      load()
    } catch {}
  }

  const nextDetailVersionNumber = () =>
    nextVersionLabel(detailsVersions.map(v => ({ version: v.version_number })))

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return shots.filter(s =>
      s.shot_name.toLowerCase().includes(q) ||
      (s.sequence || '').toLowerCase().includes(q) ||
      (s.assigned_artist || '').toLowerCase().includes(q) ||
      (s.task_name || '').toLowerCase().includes(q)
    )
  }, [shots, search])

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
          {isOwner(user) && (
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
            {isOwner(user) && (
              <input className="form-control quick-add-field" style={{ flex: '1 1 90px' }} type="number" value={quickForm.amount} onChange={e => setQuickForm(q => ({ ...q, amount: e.target.value }))} placeholder="Cost ₹" min="0" />
            )}
            <label className="quick-add-file-btn quick-add-field quick-add-file" style={{ flex: '1.5 1 120px' }} title={quickForm.video_file_name || 'Pick video to generate thumbnail'}>
              <input type="file" accept="video/*" onChange={handleQuickAddVideoChange} style={{ display: 'none' }} />
              {quickForm.video_file_name
                ? <><span className="quick-add-file-icon">🎬</span><span className="quick-add-file-name">{quickForm.video_file_name}</span></>
                : <><span className="quick-add-file-icon">🖼</span><span>Thumb Video</span></>}
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
      {uploadingThumbs.size > 0 && (
        <div className="alert" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--yellow)', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="spinner" style={{ width: 14, height: 14, borderColor: 'var(--yellow)', borderTopColor: 'transparent' }} />
          Uploading {uploadingThumbs.size} thumbnail{uploadingThumbs.size > 1 ? 's' : ''} — please don't close this tab.
        </div>
      )}

      {/* Toolbar Search & View Mode Toggle */}
      <div className="shots-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
        
        <div className="toggle-btn-group">
          <button
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View (Cards)"
          >
            🖼 Cards
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View (Table)"
          >
            📋 List
          </button>
        </div>
      </div>

      {/* Conditionally Render ShotsGrid or ShotsTable */}
      {viewMode === 'grid' ? (
        <ShotsGrid
          shots={filtered}
          canAdmin={canAdmin}
          onUpdateStatus={handleUpdateStatus}
          onOpenDetails={openDetailsPopup}
          uploadingThumbs={uploadingThumbs}
          onThumbClick={setThumbnailModalSrc}
          onThumbHoverStart={startThumbHoverTimer}
          onThumbHoverEnd={clearThumbHover}
          onPreview={setLightboxSrc}
        />
      ) : (
        <ShotsTable
          shots={filtered}
          outsourceEntries={outsourceEntries}
          canAdmin={canAdmin}
          isOwner={isOwner(user)}
          uploadingThumbs={uploadingThumbs}
          onRowClick={handleRowClick}
          onOpenDetails={openDetailsPopup}
          onOpenFiles={openFilesModal}
          onEdit={openEdit}
          onEditEta={(shot) => { setEtaInput(shot.est_hours || ''); setShowEditEta(shot) }}
          onToggleOutsource={toggleOutsourceStatus}
          onDelete={setDeleteTarget}
          onThumbClick={setThumbnailModalSrc}
          onThumbHoverStart={startThumbHoverTimer}
          onThumbHoverEnd={clearThumbHover}
          onPreview={setLightboxSrc}
        />
      )}


      <AddEditShotModal
        show={showAddShot}
        editShot={editShot}
        form={form}
        setForm={setForm}
        saving={saving}
        shotFileObj={shotFileObj}
        setShotFileObj={setShotFileObj}
        users={users}
        isOwner={isOwner(user)}
        onSave={handleSave}
        onClose={() => { setShowAddShot(false); setEditShot(null); setShotFileObj(null) }}
      />


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

      {/* Thumbnail click — zoomed view modal */}
      {thumbnailModalSrc && (
        <div
          onClick={() => setThumbnailModalSrc(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}>
            <button
              onClick={() => setThumbnailModalSrc(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
            >✕</button>
            <img src={thumbnailModalSrc} alt="Thumbnail" style={{ maxWidth: '72vw', maxHeight: '72vh', display: 'block', borderRadius: 10 }} />
          </div>
        </div>
      )}

      {/* Thumbnail hover — 3 s popover (40 % larger, no modal) */}
      {hoveredThumb && (
        <div
          style={{
            position: 'fixed',
            left: Math.round(hoveredThumb.rect.left + hoveredThumb.rect.width / 2 - (64 * 2) / 2),
            top: Math.round(hoveredThumb.rect.top - 36 * 2 - 10),
            width: Math.round(64 * 2),
            height: Math.round(36 * 2),
            zIndex: 9998,
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
            border: '1px solid var(--border)',
            pointerEvents: 'none',
          }}
        >
          <img src={hoveredThumb.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
          {isOwner(user) && (
            <div className="form-group mt-3">
              <label className="form-label">Outsource Cost (₹) *</label>
              <input className="form-control" type="number" value={osForm.cost} onChange={e => setOsForm(o => ({ ...o, cost: e.target.value }))} placeholder="e.g. 25000" min="0" required />
            </div>
          )}
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


      <ImportShotsModal
        show={showImport}
        importShotsData={importShotsData}
        importPreviewError={importPreviewError}
        importing={importing}
        onFileChange={handleExcelImportChange}
        onConfirm={confirmExcelImport}
        onClose={() => setShowImport(false)}
      />


      <FilesCorrectionsModal
        filesShot={filesShot}
        canAdmin={canAdmin}
        shotFiles={shotFiles}
        shotLogs={shotLogs}
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        uploadFileObj={uploadFileObj}
        uploading={uploading}
        uploadMsg={uploadMsg}
        showAddCorrection={showAddCorrection}
        setShowAddCorrection={setShowAddCorrection}
        corrText={corrText}
        setCorrText={setCorrText}
        onFileChange={handleShotFileChange}
        onUpload={handleUploadShotFile}
        onScreenshotChange={handleScreenshotChange}
        onSubmitCorrection={handleSubmitCorrection}
        onClose={() => setFilesShot(null)}
      />


      <ShotDetailsModal
        shot={selectedDetailsShot}
        outsourceEntries={outsourceEntries}
        users={users}
        canAdmin={canAdmin}
        isOwner={isOwner(user)}
        detailsVersions={detailsVersions}
        detailsFiles={detailsFiles}
        detailsLogs={detailsLogs}
        detailsActiveTab={detailsActiveTab}
        setDetailsActiveTab={setDetailsActiveTab}
        showDetailAddVersion={showDetailAddVersion}
        setShowDetailAddVersion={setShowDetailAddVersion}
        detailVersionForm={detailVersionForm}
        setDetailVersionForm={setDetailVersionForm}
        savingDetailVersion={savingDetailVersion}
        detailFeedbackVersion={detailFeedbackVersion}
        setDetailFeedbackVersion={setDetailFeedbackVersion}
        detailFeedbackForm={detailFeedbackForm}
        setDetailFeedbackForm={setDetailFeedbackForm}
        savingDetailFeedback={savingDetailFeedback}
        editingDetailStatus={editingDetailStatus}
        setEditingDetailStatus={setEditingDetailStatus}
        detailStatusForm={detailStatusForm}
        setDetailStatusForm={setDetailStatusForm}
        savingDetailStatus={savingDetailStatus}
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        uploadFileObj={uploadFileObj}
        uploading={uploading}
        uploadMsg={uploadMsg}
        showAddCorrection={showAddCorrection}
        setShowAddCorrection={setShowAddCorrection}
        corrText={corrText}
        setCorrText={setCorrText}
        onSubmitVersion={handleDetailSubmitVersion}
        onSaveFeedback={handleDetailSaveFeedback}
        onDeleteVersion={handleDetailDeleteVersion}
        onEditStatusOpen={openDetailStatusEdit}
        onSaveStatus={saveDetailStatus}
        onFileChange={handleShotFileChange}
        onDetailUpload={handleDetailUploadFile}
        onScreenshotChange={handleScreenshotChange}
        onDetailSubmitCorrection={handleDetailSubmitCorrection}
        nextVersionNumber={nextDetailVersionNumber}
        username={user?.username}
        onEdit={openEdit}
        onClose={() => setSelectedDetailsShot(null)}
      />

    </div>
  )
}
