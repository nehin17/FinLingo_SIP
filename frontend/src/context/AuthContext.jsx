// src/context/AuthContext.jsx

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
  } from 'react'
  
  import authService from '../services/authService.js'
  
  // ============================================================
  // AUTH CONTEXT
  // ============================================================
  
  const AuthContext = createContext(null)
  
  // ============================================================
  // AUTH PROVIDER
  // ============================================================
  //
  // AuthContext is the SINGLE source of truth for authentication.
  //
  // Components should NOT:
  // - read LocalStorage directly
  // - write LocalStorage directly
  // - maintain their own authentication state
  //
  // They should use:
  //
  // const { user, isAuthenticated, signin, signup, logout } = useAuth()
  //
  // BACKEND INTEGRATION:
  // The provider will continue to work when authService changes
  // from LocalStorage to real API requests.
  // ============================================================
  
  export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
  
    // Loading starts as true because we need to determine whether
    // an existing session exists.
    const [loading, setLoading] = useState(true)
  
    // ==========================================================
    // INITIALIZE AUTHENTICATION
    // ==========================================================
  
    useEffect(() => {
      let mounted = true
  
      async function initializeAuth() {
        try {
          // ------------------------------------------------------
          // CURRENT:
          // Read the temporary LocalStorage session.
          //
          // BACKEND INTEGRATION:
          // This will become:
          //
          // const currentUser = await authService.getCurrentUser()
          //
          // which will call GET /api/auth/me.
          // ------------------------------------------------------
  
          const currentUser = await authService.getCurrentUser()
  
          if (mounted) {
            setUser(currentUser)
          }
        } catch {
          if (mounted) {
            setUser(null)
          }
        } finally {
          if (mounted) {
            setLoading(false)
          }
        }
      }
  
      initializeAuth()
  
      return () => {
        mounted = false
      }
    }, [])
  
    // ==========================================================
    // SIGN UP
    // ==========================================================
  
    const signup = useCallback(async (userData) => {
      const authenticatedUser =
        await authService.signup(userData)
  
      setUser(authenticatedUser)
  
      return authenticatedUser
    }, [])
  
    // ==========================================================
    // SIGN IN
    // ==========================================================
  
    const signin = useCallback(async (email, password) => {
      const authenticatedUser =
        await authService.signin(email, password)
  
      setUser(authenticatedUser)
  
      return authenticatedUser
    }, [])
  
    // ==========================================================
    // LOGOUT
    // ==========================================================
  
    const logout = useCallback(async () => {
      await authService.logout()
  
      setUser(null)
    }, [])
  
    // Fetch a new server-owned profile after changing email or display name.
    const refreshUser = useCallback(async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      return currentUser
    }, [])

    useEffect(() => {
      const syncAvatar = () => { refreshUser().catch(() => {}) }
      window.addEventListener('finlingo:avatar-updated', syncAvatar)
      return () => window.removeEventListener('finlingo:avatar-updated', syncAvatar)
    }, [refreshUser])

    // ==========================================================
    // CONTEXT VALUE
    // ==========================================================
  
    const value = {
      user,
  
      loading,
  
      isAuthenticated: user !== null,
  
      signup,
      signin,
      logout,
      refreshUser,
    }
  
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    )
  }
  
  // ============================================================
  // USE AUTH
  // ============================================================
  
  export function useAuth() {
    const context = useContext(AuthContext)
  
    if (context === null) {
      throw new Error(
        'useAuth must be used within an AuthProvider'
      )
    }
  
    return context
  }
  
  export default AuthContext