// Thin client for the backend API. The session lives in an HttpOnly cookie that
// JavaScript can't read. We only hold the CSRF token, in memory.
import { useCallback, useEffect, useRef, useState } from 'react'

let csrfToken = null
export const setCsrfToken = (t) => {
  csrfToken = t
}

export class ApiError extends Error {
  constructor(status, body = {}) {
    super(body.message || (status === 0 ? 'We couldn’t reach the server. Check your connection and try again.' : 'Something went wrong.'))
    this.status = status
    this.code = body.error || (status === 0 ? 'network' : 'error')
    this.fields = body.fields || {}
    this.body = body
  }
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(method !== 'GET' && csrfToken && { 'X-CSRF-Token': csrfToken }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new CustomEvent('sfp:unauthorized', { detail: data }))
    }
    throw new ApiError(res.status, data)
  }
  return data
}

/** Fetch a resource on mount (and when `path` changes). Returns { data, loading, error, reload, setData }. */
export function useApi(path, { pick } = {}) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null })
  const pickRef = useRef(pick)
  pickRef.current = pick
  const reqId = useRef(0)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!path) return
      const id = ++reqId.current
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const res = await api(path)
        if (id === reqId.current) setState({ data: pickRef.current ? pickRef.current(res) : res, loading: false, error: null })
      } catch (error) {
        if (id === reqId.current) setState((s) => ({ ...s, loading: false, error }))
      }
    },
    [path],
  )

  useEffect(() => {
    load()
  }, [load])

  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })), [])
  return { ...state, reload: load, setData }
}

export function newIdempotencyKey() {
  return `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join('')}`
}
