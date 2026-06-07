import { useState, useEffect, useRef } from 'react'
import { DEPT_STATUSES, STATUS_COLORS } from './constants'

export default function StatusSelectDropdown({ value, onChange, options }) {
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
