console.log("api.js is successfully loaded!");

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const getAuthToken = () =>
  localStorage.getItem('finlingo_token')

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = 'Something went wrong'

    try {
      const error = await response.json()
      message = error.message || message
    } catch {}

    const error = new Error(message)
    error.status = response.status
    throw error
  }

  
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export const api = {
  auth: {
    register: (userData) =>
      apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    login: (credentials) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    getMe: () => apiRequest('/auth/me'),
  },

  companies: {
    getAll: () => apiRequest('/companies'),

    getByTicker: (ticker) =>
      apiRequest(`/companies/${ticker}`),

    getNews: (ticker) =>
      apiRequest(`/companies/${encodeURIComponent(ticker)}/news`),

    search: (query) =>
        apiRequest(`/companies/search?q=${encodeURIComponent(query)}`),

    getResearchByTicker: (ticker) =>
        apiRequest(`/companies/${ticker}/research`),

    ingest: (ticker) =>
      apiRequest(`/ingest/${ticker}`, {
        method: 'POST',
      }),
  },
  watchlist: {
    getAll: () => apiRequest('/watchlist'),

    add: (ticker) =>
      apiRequest(`/watchlist/${ticker}`, {
        method: 'POST',
      }),

    remove: (ticker) =>
      apiRequest(`/watchlist/${ticker}`, {
        method: 'DELETE',
      }),
  },
  terms: {
    getAll: () => apiRequest('/terms'),

    getByTerm: (term) =>
      apiRequest(`/terms/${term}`),
  },
  ai: {
    chat: (ticker, message) =>
      apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ ticker, message }),
      }),
  },
}