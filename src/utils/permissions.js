/**
 * Checks if the user has Admin or Coordinator capabilities.
 * @param {object} user 
 * @returns {boolean}
 */
export function isAdmin(user) {
  return user?.role === 'admin' || user?.role === 'coordinator'
}

/**
 * Checks if the user is strictly an Owner / Admin.
 * @param {object} user 
 * @returns {boolean}
 */
export function isOwner(user) {
  return user?.role === 'admin'
}

/**
 * Checks if the user is strictly an Artist.
 * @param {object} user 
 * @returns {boolean}
 */
export function isArtist(user) {
  return user?.role === 'artist'
}

/**
 * Returns the CSS pill class based on user role.
 * @param {object} user 
 * @returns {string}
 */
export function getRolePillClass(user) {
  if (user?.role === 'admin') return 'admin-pill'
  if (user?.role === 'coordinator') return 'coord-pill'
  return 'artist-pill'
}

/**
 * Returns the display label with an icon emoji for the user role.
 * @param {object} user 
 * @returns {string}
 */
export function getRoleLabel(user) {
  if (user?.role === 'admin') return '🛡️ Admin'
  if (user?.role === 'coordinator') return '🎯 Coordinator'
  return '🎨 Artist'
}
