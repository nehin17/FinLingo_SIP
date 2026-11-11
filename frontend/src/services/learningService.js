const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export class LearningRequestError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'LearningRequestError'
    this.status = status
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('finlingo_token')
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const headers = { 'Content-Type': 'application/json', 'X-Timezone': zone, ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
  } catch {
    throw new LearningRequestError('Cannot reach FINLINGO backend. Check that Spring Boot is running.')
  }
  if (!response.ok) {
    let serverMessage = ''
    try {
      const data = await response.json()
      serverMessage = data.message || data.detail || ''
    } catch { /* An HTTP error may contain plain text. */ }
    if (response.status === 404) {
      throw new LearningRequestError('Learning API not found. Restart Spring Boot with the Learn Hub integration installed.', 404)
    }
    if (response.status === 401 || response.status === 403) {
      throw new LearningRequestError('The learning service could not verify your session.', response.status)
    }
    throw new LearningRequestError(serverMessage || `Learning service returned HTTP ${response.status}.`, response.status)
  }
  if (response.status === 204) return null
  return response.json()
}

// Refresh every visible Navbar only after the server confirms the activity.
async function savedActivity(promise) {
  const result = await promise
  window.dispatchEvent(new Event('finlingo:learning-activity'))
  return result
}

export const learningService = {
  progress: () => request('/learn/progress'),
  streak: () => request('/learn/streak'),
  complete: (lessonId) => savedActivity(request(`/learn/progress/${encodeURIComponent(lessonId)}`, { method: 'POST' })),
  uncomplete: (lessonId) => savedActivity(request(`/learn/progress/${encodeURIComponent(lessonId)}`, { method: 'DELETE' })),
  getNote: (resourceId) => request(`/learn/notes/${encodeURIComponent(resourceId)}`),
  saveNote: (resourceId, text) => request(`/learn/notes/${encodeURIComponent(resourceId)}`, { method: 'PUT', body: JSON.stringify({ text }) }),
  submitChallenge: (questionId, selectedIndex) => savedActivity(request('/learn/challenges/attempt', {
    method: 'POST', body: JSON.stringify({ questionId, selectedIndex }),
  })),
  // On an access error, distinguish an expired JWT from a Learn API permission issue.
  verifySession: async () => {
    try { await request('/auth/me'); return true } catch { return false }
  },
  terms: () => request('/terms'),
}
