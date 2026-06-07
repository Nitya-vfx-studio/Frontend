import { useState, useEffect, useRef } from 'react'
import { TASK_OPTIONS } from './constants'

export default function TaskSelectDropdown({ value, onChange }) {
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
