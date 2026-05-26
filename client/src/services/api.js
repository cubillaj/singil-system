const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const error = new Error(data?.message ?? data?.error ?? 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers)
  const hasFormData = options.body instanceof FormData

  if (!hasFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  return parseResponse(response)
}

export const authApi = {
  me: () => apiRequest('/api/auth/me'),
  login: (payload) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  register: (payload) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
}

export const organizationApi = {
  members: (params = {}) => apiRequest(`/api/organization?${new URLSearchParams(params)}`),
  member: (id) => apiRequest(`/api/organization/${id}`),
  updateMember: (id, payload) => apiRequest(`/api/organization/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteMember: (id) => apiRequest(`/api/organization/${id}`, { method: 'DELETE' }),
  updateProfile: (payload) => apiRequest('/api/organization/org-profile', {
    method: 'PUT',
    body: payload,
  }),
}

export const invitationApi = {
  list: (params = {}) => apiRequest(`/api/invitation?${new URLSearchParams(params)}`),
  create: (payload) => apiRequest('/api/invitation', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  delete: (id, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/api/invitation/${id}${query ? `?${query}` : ''}`, { method: 'DELETE' })
  },
}

export const clientApi = {
  list: (params = {}) => apiRequest(`/api/clients?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/api/clients/${id}`),
  create: (payload) => apiRequest('/api/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  delete: (id) => apiRequest(`/api/clients/${id}`, { method: 'DELETE' }),
}

export const productApi = {
  list: (params = {}) => apiRequest(`/api/products?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/api/products/${id}`),
  create: (payload) => apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  delete: (id) => apiRequest(`/api/products/${id}`, { method: 'DELETE' }),
}

export const invoiceApi = {
  list: (params = {}) => apiRequest(`/api/invoices?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/api/invoices/${id}`),
  create: (payload) => apiRequest('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  delete: (id) => apiRequest(`/api/invoices/${id}`, { method: 'DELETE' }),
  export: (id) => apiRequest(`/api/export-invoice/${id}`),
}
