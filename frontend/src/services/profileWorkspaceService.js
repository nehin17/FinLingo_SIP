// Standalone service: no changes to the shared api.js file.
const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '')

async function request(path, init = {}) {
  const token = localStorage.getItem('finlingo_token')
  if (!token) throw new Error('Sign in to update your profile.')
  let response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    })
  } catch {
    throw new Error('Cannot connect to FINLINGO. Check that the backend is running.')
  }
  if (!response.ok) {
    const message = await response.json().catch(() => ({}))
    if (response.status === 401 || response.status === 403) {
      throw new Error('Your session has expired. Please sign in again.')
    }
    throw new Error(message.message || `Profile request failed (${response.status}).`)
  }
  return response.json()
}

export const profileWorkspaceService = {
  getStatus: () => request('/account/workspace/status'),
  setStatus: (status) => request('/account/workspace/status', { method: 'PUT', body: JSON.stringify({ status }) }),
  getLearningStreak: () => request('/learn/streak'),
}
