// Kept separate from api.js so existing Learn Hub and Watchlist integrations stay intact.
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const token = localStorage.getItem('finlingo_token')
  if (!token) {
    const error = new Error('Sign in to manage your account.')
    error.status = 401
    throw error
  }
  let response
  try {
    response = await fetch(`${API_BASE_URL}/account${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Cannot reach the account service. Check that Spring Boot is running.')
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const error = new Error(errorBody?.message || errorBody?.detail || (
      response.status === 401 || response.status === 403
        ? 'Your session is no longer valid. Sign out and sign in again.'
        : `Account request failed (${response.status}).`
    ))
    error.status = response.status
    throw error
  }
  return response.json()
}

const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) })

export const accountSettingsService = {
  get: () => request('/settings'),
  updateProfile: (body) => put('/profile', body),
  updateAppearance: (themePreference) => put('/appearance', { themePreference }),
  updateEmail: (body) => put('/email', body),
  updatePassword: (body) => put('/password', body),
  exportData: () => request('/export'),
  deleteAccount: (body) => request('', { method: 'DELETE', body: JSON.stringify(body) }),
}

export function useNewAccountToken(result) {
  if (result?.token) localStorage.setItem('finlingo_token', result.token)
}
