import apiClient from './apiClient'

// ── Projects ────────────────────────────────────────────────────────────────
export const getProjects = () => 
  apiClient.get('/projects/')

export const getProject = (id) => 
  apiClient.get(`/projects/${id}`)

export const createProject = (data) => 
  apiClient.post('/projects/', data)

export const updateProject = (id, data) => 
  apiClient.put(`/projects/${id}`, data)

export const deleteProject = (id) => 
  apiClient.delete(`/projects/${id}`)

// ── Shots ───────────────────────────────────────────────────────────────────
export const getShots = (projectId, params) => 
  apiClient.get(`/projects/${projectId}/shots/`, { params })

export const getShot = (projectId, shotId) => 
  apiClient.get(`/projects/${projectId}/shots/${shotId}`)

export const createShot = (projectId, data) => 
  apiClient.post(`/projects/${projectId}/shots/`, data)

export const updateShot = (projectId, shotId, data) => 
  apiClient.put(`/projects/${projectId}/shots/${shotId}`, data)

export const deleteShot = (projectId, shotId) => 
  apiClient.delete(`/projects/${projectId}/shots/${shotId}`)

export const importShots = (projectId, file) => {
  const form = new FormData()
  form.append('file', file)
  return apiClient.post(`/projects/${projectId}/shots/import`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const exportShotsCSV = (projectId) =>
  apiClient.get(`/projects/${projectId}/shots/export/csv`, { responseType: 'blob' })

// ── Versions ────────────────────────────────────────────────────────────────
export const getVersions = (projectId, shotId) =>
  apiClient.get(`/projects/${projectId}/shots/${shotId}/versions/`)

export const createVersion = (projectId, shotId, data) =>
  apiClient.post(`/projects/${projectId}/shots/${shotId}/versions/`, data)

export const updateVersion = (projectId, shotId, versionId, data) =>
  apiClient.put(`/projects/${projectId}/shots/${shotId}/versions/${versionId}`, data)

export const deleteVersion = (projectId, shotId, versionId) =>
  apiClient.delete(`/projects/${projectId}/shots/${shotId}/versions/${versionId}`)

// ── Feedback history ────────────────────────────────────────────────────────
export const getProjectFeedback = (projectId) => 
  apiClient.get(`/projects/${projectId}/feedback/`)

// ── Batches ─────────────────────────────────────────────────────────────────
export const getBatches = (projectId) => 
  apiClient.get(`/projects/${projectId}/batches/`)

export const createBatch = (projectId, data) => 
  apiClient.post(`/projects/${projectId}/batches/`, data)

export const updateBatch = (projectId, batchId, data) => 
  apiClient.put(`/projects/${projectId}/batches/${batchId}`, data)

export const deleteBatch = (projectId, batchId) => 
  apiClient.delete(`/projects/${projectId}/batches/${batchId}`)

// ── Shot Files & Feedback Logs ──────────────────────────────────
export const getShotFiles = (projectId, shotId) =>
  apiClient.get(`/projects/${projectId}/shots/${shotId}/files`)

export const uploadShotFile = (projectId, shotId, data) =>
  apiClient.post(`/projects/${projectId}/shots/${shotId}/files`, data)

export const getShotLogs = (projectId, shotId) =>
  apiClient.get(`/projects/${projectId}/shots/${shotId}/logs`)

export const createShotLog = (projectId, shotId, data) =>
  apiClient.post(`/projects/${projectId}/shots/${shotId}/logs`, data)

// ── Thumbnails ──────────────────────────────────────────────────────────────
export const getThumbnailUploadUrl = (projectId, shotId) =>
  apiClient.get(`/projects/${projectId}/shots/${shotId}/thumbnail/upload-url`)

export const confirmThumbnail = (projectId, shotId, thumbnailKey) =>
  apiClient.patch(`/projects/${projectId}/shots/${shotId}/thumbnail/confirm`, { thumbnail_key: thumbnailKey })
