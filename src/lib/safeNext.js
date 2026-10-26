/** Only allow same-site relative paths after login, to prevent open redirects. */
export function safeNext(next, fallback) {
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) return next
  return fallback
}
