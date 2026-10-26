// Safe wrappers around browser storage. Storage can be blocked (private mode,
// disabled cookies), so every access is guarded and falls back to a default.

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

/**
 * Salted SHA-256 digest. It stands in for bcrypt/argon2, which run server-side
 * in production. Plain-text passwords are never written to storage.
 */
export async function hashPassword(password, salt) {
  const input = `${salt}:${password}`
  if (window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Fallback for insecure contexts (FNV-1a, demo only).
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export function randomSalt() {
  const arr = new Uint8Array(12)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
