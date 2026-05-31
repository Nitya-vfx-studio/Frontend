import apiClient from './apiClient'

/**
 * Sends login credentials to backend to establish a session token.
 * @param {string} username 
 * @param {string} password 
 */
export const login = (username, password) =>
  apiClient.post('/auth/login', { username, password })

/**
 * Fetches the active verified profile payload based on current credentials.
 */
export const getMe = () => 
  apiClient.get('/auth/me')

/**
 * Validates a Google ID Token against backend white-list and retrieves session token.
 * @param {string} idToken 
 */
export const googleLogin = (idToken) =>
  apiClient.post('/auth/google', { id_token: idToken })

/**
 * Fetches the public auth config including the Google client ID.
 */
export const getAuthConfig = () =>
  apiClient.get('/auth/config')


