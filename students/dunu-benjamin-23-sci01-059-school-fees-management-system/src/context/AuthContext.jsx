import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, setCsrfToken, ApiError } from '../lib/api'

// Authentication is handled by the API: passwords are bcrypt-hashed on the server
// and the session is a Secure, HttpOnly, SameSite=Strict cookie. This context only
// mirrors the signed-in user so the UI can render.

const AuthContext = createContext(null)

export const MAX_ATTEMPTS = 5
export const IDLE_WARNING_S = 60
export let IDLE_LIMIT_MS = 10 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)
  const [expired, setExpired] = useState(false)

  const applySession = useCallback((res) => {
    setUser(res.user)
    setSession(res.session)
    setCsrfToken(res.csrfToken)
    if (res.session?.idleMinutes) IDLE_LIMIT_MS = res.session.idleMinutes * 60 * 1000
    setExpired(false)
  }, [])

  const clear = useCallback((wasExpired = false) => {
    setUser(null)
    setSession(null)
    setCsrfToken(null)
    setExpired(wasExpired)
  }, [])

  useEffect(() => {
    api('/api/auth/session')
      .then((res) => (res.user ? applySession(res) : clear(res.expired)))
      .catch(() => clear())
      .finally(() => setBooting(false))
  }, [applySession, clear])

  // Any API call that comes back 401 means the server ended the session.
  useEffect(() => {
    const onUnauthorized = () => clear(true)
    window.addEventListener('sfp:unauthorized', onUnauthorized)
    return () => window.removeEventListener('sfp:unauthorized', onUnauthorized)
  }, [clear])

  const login = useCallback(
    async (identifier, password, remember = false) => {
      try {
        const res = await api('/api/auth/login', { method: 'POST', body: { identifier, password, remember } })
        if (res.otp) return { otp: true, email: res.email, devOtp: res.devOtp }
        applySession(res)
        return { ok: true, role: res.user.role }
      } catch (e) {
        if (!(e instanceof ApiError)) throw e
        if (e.code === 'locked') return { error: 'locked', lockedUntil: new Date(e.body.lockedUntil).getTime() }
        if (e.code === 'unverified') return { error: 'unverified', email: e.body.email }
        if (e.code === 'invalid_credentials') return { error: 'invalid', remaining: e.body.remaining }
        if (e.code?.startsWith('account_')) return { error: 'suspended', message: e.message }
        if (e.code === 'rate_limited') return { error: 'rate_limited', retryAfter: e.body.retryAfter }
        return { error: 'other', message: e.message }
      }
    },
    [applySession],
  )

  const verifyOtp = useCallback(
    async (code) => {
      try {
        const res = await api('/api/auth/otp', { method: 'POST', body: { code } })
        applySession(res)
        return { ok: true, role: res.user.role }
      } catch (e) {
        if (e.code === 'otp_expired') return { error: 'expired' }
        if (e.code === 'otp_locked') return { error: 'locked' }
        if (e.code === 'otp_invalid') return { error: 'invalid', remaining: e.body.remaining }
        return { error: 'other', message: e.message }
      }
    },
    [applySession],
  )

  const resendOtp = useCallback(() => api('/api/auth/otp/resend', { method: 'POST', body: {} }), [])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} })
    } catch {
      /* the session is cleared locally either way */
    }
    clear()
  }, [clear])

  /** Mark the session as expired locally (idle timeout) and tell the server. */
  const expire = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} })
    } catch {
      /* ignore */
    }
    clear(true)
  }, [clear])

  const register = useCallback(async (data) => {
    try {
      const res = await api('/api/auth/register', { method: 'POST', body: data })
      return { ok: true, email: res.email, devToken: res.devToken }
    } catch (e) {
      if (e.code === 'matric_taken') return { error: 'matric', message: e.message }
      if (e.code === 'email_taken') return { error: 'email', message: e.message }
      return { error: e.code === 'bad_request' ? 'validation' : 'other', message: e.message, fields: e.fields }
    }
  }, [])

  const verifyEmail = useCallback(async (token) => {
    try {
      await api('/api/auth/verify-email', { method: 'POST', body: { token } })
      return { ok: true }
    } catch (e) {
      return { error: e.message }
    }
  }, [])

  const resendVerification = useCallback((email) => api('/api/auth/resend-verification', { method: 'POST', body: { email } }), [])
  const forgotPassword = useCallback((email) => api('/api/auth/forgot', { method: 'POST', body: { email } }), [])

  const resetPassword = useCallback(async (token, password) => {
    try {
      await api('/api/auth/reset', { method: 'POST', body: { token, password } })
      return { ok: true }
    } catch (e) {
      if (e.code === 'token_expired') return { error: 'expired' }
      return { error: 'other', message: e.message, fields: e.fields }
    }
  }, [])

  const changePassword = useCallback(async (current, next) => {
    try {
      const res = await api('/api/me/password', { method: 'POST', body: { current, next } })
      return { ok: true, revoked: res.revoked }
    } catch (e) {
      return { error: e.code, message: e.message, fields: e.fields }
    }
  }, [])

  const getLockout = useCallback(async (identifier) => {
    try {
      const res = await api(`/api/auth/lockout?identifier=${encodeURIComponent(identifier)}`)
      return res.lockedUntil ? new Date(res.lockedUntil).getTime() : null
    } catch {
      return null
    }
  }, [])

  const value = {
    user,
    session,
    booting,
    expired,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    setUser,
    login,
    verifyOtp,
    resendOtp,
    logout,
    expire,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    getLockout,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
