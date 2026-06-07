// xlsx is loaded on demand so it stays out of the main bundle (~430 kB).
export async function downloadShotTemplate() {
  const XLSX = await import('xlsx')
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

/**
 * Parse a shots .xlsx ArrayBuffer/binary string into normalized rows.
 * @returns {{ rows: object[] } | { error: string }}
 */
export async function parseShotsWorkbook(binaryData) {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(binaryData, { type: 'binary' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (data.length < 2) return { error: 'No data rows found.' }

  const headers = data[0].map(h => String(h).trim().toLowerCase())
  const nameIdx = headers.findIndex(h => h.includes('shot'))
  const framesIdx = headers.findIndex(h => h.includes('frame'))
  const taskIdx = headers.findIndex(h => h.includes('task'))
  const estIdx = headers.findIndex(h => h.includes('hour') || h.includes('est'))
  const artistIdx = headers.findIndex(h => h.includes('assign') || h.includes('artist'))

  if (nameIdx < 0) return { error: 'Could not find "Shot Name" column in Excel sheet.' }

  const rows = data.slice(1)
    .filter(r => r[nameIdx] && String(r[nameIdx]).trim())
    .map(r => ({
      shot_name: String(r[nameIdx]).trim(),
      frame_count: framesIdx >= 0 ? parseInt(r[framesIdx]) || 0 : 0,
      task_name: taskIdx >= 0 ? String(r[taskIdx]).trim() : '',
      est_hours: estIdx >= 0 ? parseFloat(r[estIdx]) || 0 : 0,
      assigned_artist: artistIdx >= 0 ? String(r[artistIdx]).trim() : '',
    }))
  return { rows }
}
