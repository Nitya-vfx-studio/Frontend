/**
 * Grab a 640×360 JPEG poster frame (~10% into the clip) from a video File.
 * @param {File} file - a video file
 * @returns {Promise<Blob>} a JPEG blob suitable for thumbnail upload
 */
export function generateThumbnailBlob(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl
    video.onloadedmetadata = () => { video.currentTime = Math.max(video.duration * 0.1, 0.5) }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = 360
      const ctx = canvas.getContext('2d')
      const vw = video.videoWidth || 640, vh = video.videoHeight || 360
      const scale = Math.min(640 / vw, 360 / vh)
      const sw = vw * scale, sh = vh * scale
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, 640, 360)
      ctx.drawImage(video, (640 - sw) / 2, (360 - sh) / 2, sw, sh)
      URL.revokeObjectURL(objectUrl)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85)
    }
    video.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Video load failed')) }
  })
}
