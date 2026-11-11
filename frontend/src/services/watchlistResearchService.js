// Isolated Watchlist research writer. We deliberately leave the shared api.js untouched
// so existing Learn Hub, authentication, and other integrations are preserved.
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '')

export async function updateWatchlistResearch(ticker, research) {
  const token = localStorage.getItem('finlingo_token')
  if (!token) throw new Error('Sign in to save your Watchlist research.')
  if (!/^[A-Z.]{1,10}$/i.test(ticker || '')) throw new Error('Invalid company ticker.')

  const response = await fetch(`${API_BASE_URL}/watchlist/${encodeURIComponent(ticker)}/research`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(research),
  })

  const body = await response.text()
  let result = null
  if (body) {
    try { result = JSON.parse(body) } catch { /* Some Spring errors use plain text */ }
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Your session is no longer authorized. Sign out and sign in again.')
    }
    throw new Error(result?.message || result?.detail || `Save failed (HTTP ${response.status}).`)
  }
  if (!result || typeof result !== 'object') {
    throw new Error('Server did not confirm the research update.')
  }
  return result
}
