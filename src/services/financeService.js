import apiClient from './apiClient'

// ── Outsource ───────────────────────────────────────────────────────────────
export const getOutsource = (params) => 
  apiClient.get('/outsource/', { params })

export const createOutsource = (data) => 
  apiClient.post('/outsource/', data)

export const updateOutsource = (id, data) => 
  apiClient.put(`/outsource/${id}`, data)

export const deleteOutsource = (id) => 
  apiClient.delete(`/outsource/${id}`)

// ── Payments ────────────────────────────────────────────────────────────────
export const getPayments = () => 
  apiClient.get('/payments/')

export const createPayment = (data) => 
  apiClient.post('/payments/', data)

export const deletePayment = (id) => 
  apiClient.delete(`/payments/${id}`)

// ── Invoices ────────────────────────────────────────────────────────────────
export const getInvoices = () => 
  apiClient.get('/invoices/')

export const createInvoice = (data) => 
  apiClient.post('/invoices/', data)

export const updateInvoice = (id, data) => 
  apiClient.put(`/invoices/${id}`, data)

export const deleteInvoice = (id) => 
  apiClient.delete(`/invoices/${id}`)
