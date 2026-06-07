import { useEffect, useState } from 'react'
import { getUsers } from '../services/userService'

// Session-wide cache shared across every useUsers() consumer so the /users/ list
// is fetched once, not on every ProjectDetail / TimeLogs / Salary / Batches mount.
// `inflight` de-dupes concurrent first-loads from multiple components.
let cache = null
let inflight = null

function load() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = getUsers()
      .then((res) => { cache = res.data; return cache })
      .finally(() => { inflight = null })
  }
  return inflight
}

/** Drop the cache so the next useUsers() refetches. Call after creating/updating/deleting users. */
export function invalidateUsers() {
  cache = null
  inflight = null
}

/**
 * Shared, cached users list.
 * @param {{ activeOnly?: boolean }} [opts] - activeOnly filters out deactivated users.
 * @returns {{ users: object[], loading: boolean, refresh: () => Promise<object[]> }}
 */
export function useUsers({ activeOnly = false } = {}) {
  const [users, setUsers] = useState(cache || [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    let alive = true
    load()
      .then((data) => { if (alive) { setUsers(data); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const list = activeOnly ? users.filter((u) => u.is_active) : users
  return {
    users: list,
    loading,
    refresh: () => { invalidateUsers(); return load().then((data) => { setUsers(data); return data }) },
  }
}
