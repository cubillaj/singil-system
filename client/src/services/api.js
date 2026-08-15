const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const fallbackMessage = response.status === 429
      ? 'Too many requests. Please wait a moment and try again.'
      : 'Request failed'
    const error = new Error(data?.message ?? data?.error ?? fallbackMessage)
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
  changeMemberPassword: (id, payload) => apiRequest(`/api/organization/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteMember: (id) => apiRequest(`/api/organization/${id}`, { method: 'DELETE' }),
  updateProfile: (payload) => apiRequest('/api/organization/org-profile', {
    method: 'PUT',
    body: payload,
  }),
}

export const userApi = {
  info: () => apiRequest('/api/users/user-info'),
  update: (payload) => apiRequest('/api/users', {
    method: 'PUT',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  }),
  changePassword: (payload) => apiRequest('/api/users/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
}

export const dashboardApi = {
  get: (role) => {
    const endpoint = role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : role === 'member' ? 'member' : ''
    if (!endpoint) return Promise.resolve({})
    return apiRequest(`/api/dashboard/${endpoint}`)
  },
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
  bulkDelete: (ids, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/api/invitation${query ? `?${query}` : ''}`, {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    })
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
  exportPdf: async (id) => {
    const response = await fetch(`${API_URL}/api/export-invoice/${id}/pdf`, {
      credentials: 'include',
    })

    if (!response.ok) {
      const contentType = response.headers.get('content-type') ?? ''
      const data = contentType.includes('application/json') ? await response.json() : null
      const fallbackMessage = response.status === 429
        ? 'Too many export requests. Please wait a moment and try again.'
        : 'Failed to export PDF'
      throw new Error(data?.message ?? data?.error ?? fallbackMessage)
    }

    const disposition = response.headers.get('content-disposition') ?? ''
    const filename = disposition.match(/filename="(.+)"/)?.[1] ?? `invoice-${id}.pdf`

    return {
      blob: await response.blob(),
      filename,
    }
  },
}

export const paymentApi = {
  list: (params = {}) => apiRequest(`/api/payment?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/api/payment/${id}`),
  create: (invoiceId, payload) => apiRequest(`/api/payment/${invoiceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/payment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  delete: (id) => apiRequest(`/api/payment/${id}`, { method: 'DELETE' }),
}

export const recurringInvoiceApi = {
  list: (params = {}) => apiRequest(`/api/recurring-invoices?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/api/recurring-invoices/${id}`),
  create: (payload) => apiRequest('/api/recurring-invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/recurring-invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  delete: (id) => apiRequest(`/api/recurring-invoices/${id}`, { method: 'DELETE' }),
  generate: (id) => apiRequest(`/api/recurring-invoices/${id}/generate`, { method: 'POST' }),
}

export const subscriptionApi = {
  plans: () => apiRequest('/api/subscription/plans'),
  cancel: () => apiRequest('/api/subscription/cancel', { method: 'POST' }),
  resume: () => apiRequest('/api/subscription/resume', { method: 'POST' }),
  checkout: (payload) => apiRequest('/api/subscription', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}

export const auditLogApi = {
  list: (params = {}) => apiRequest(`/api/audit-logs?${new URLSearchParams(params)}`),
}
