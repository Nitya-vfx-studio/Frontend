import apiClient from './apiClient'

export const getTimeLogs = (params) => 
  apiClient.get('/time-logs/', { params })

export const getMyTimeLogs = () => 
  apiClient.get('/time-logs/my')

export const createTimeLog = (data) => 
  apiClient.post('/time-logs/', data)
