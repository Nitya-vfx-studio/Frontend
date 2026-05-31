/**
 * Formats a number or string as Indian Rupee (INR) currency.
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Formats milliseconds into HH:MM:SS
 * @param {number} ms 
 * @returns {string}
 */
export function msToHMS(ms) {
  if (!ms || isNaN(ms)) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':')
}

/**
 * Formats milliseconds into "Xh Ym"
 * @param {number} ms 
 * @returns {string}
 */
export function msToHM(ms) {
  if (!ms || isNaN(ms)) return '0h 0m'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

/**
 * Formats an ISO or standard date string into a localized Indian date format
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Formats file size in bytes to human-readable text
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
