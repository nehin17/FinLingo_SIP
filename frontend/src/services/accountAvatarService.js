const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '')

export async function uploadAccountAvatar(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.')
  const token = localStorage.getItem('finlingo_token')
  if (!token) throw new Error('Sign in to update your profile photo.')

  const image = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const picture = new Image()
    picture.onload = () => { URL.revokeObjectURL(url); resolve(picture) }
    picture.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Use a JPEG, PNG, or WebP image.')) }
    picture.src = url
  })
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, 480 / Math.max(image.width, image.height))
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const photo = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
  if (!photo) throw new Error('Could not prepare that photo.')
  const formData = new FormData()
  formData.append('avatar', photo, 'profile.jpg')

  const response = await fetch(`${API_BASE_URL}/account/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.message || `Photo upload failed (${response.status}).`)
  return result
}
