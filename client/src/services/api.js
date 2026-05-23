const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    throw new Error(data?.message ?? 'Request failed')
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
