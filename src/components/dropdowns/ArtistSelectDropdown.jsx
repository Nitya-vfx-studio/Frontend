import { useState, useEffect, useRef } from 'react'

export default function ArtistSelectDropdown({ selectedArtists, users, onChange }) {
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
