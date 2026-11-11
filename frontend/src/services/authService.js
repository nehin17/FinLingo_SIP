import { api } from './api.js'


async function signup(userData = {}) {
  const response = await api.auth.register(userData)

  if (response.token) {
    localStorage.setItem(
      'finlingo_token',
      response.token
    )
  }

  return {
    email: response.email,
    displayName: response.displayName,
    difficultyLevel: response.difficultyLevel,
    profilePicture: response.profilePicture || null,
  }
}


async function signin(email, password) {
  const response = await api.auth.login({
    email,
    password,
  })

  if (response.token) {
    localStorage.setItem(
      'finlingo_token',
      response.token
    )
  }

  return {
    email: response.email,
    displayName: response.displayName,
    difficultyLevel: response.difficultyLevel,
    profilePicture: response.profilePicture || null,
  }
}


async function logout() {
  localStorage.removeItem('finlingo_token')
}


async function getCurrentUser() {
  const token =
    localStorage.getItem('finlingo_token')

  if (!token) {
    return null
  }

  try {
    return await api.auth.getMe()
  } catch {
    localStorage.removeItem('finlingo_token')
    return null
  }
}


function isAuthenticated() {
  return Boolean(
    localStorage.getItem('finlingo_token')
  )
}


async function forgotPassword() {
  throw new Error(
    'Password reset is not implemented yet'
  )
}


const authService = {
  signup,
  signin,
  logout,
  getCurrentUser,
  isAuthenticated,
  forgotPassword,
}

export default authService