import apiClient from './apiClient'

export const getMe = () =>
  apiClient.get('/auth/me')

export const googleLogin = (idToken) =>
  apiClient.post('/auth/google', { id_token: idToken })

export const getAuthConfig = () =>
  apiClient.get('/auth/config')

export const impersonate = (userId) =>
  apiClient.post(`/auth/impersonate/${userId}`)


