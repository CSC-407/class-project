import { useCallback, useEffect, useState } from 'react'

export function useCountdown(initial) {
  const [seconds, setSeconds] = useState(initial)
  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])
  const restart = useCallback((s = initial) => setSeconds(s), [initial])
  return { seconds, restart }
}

export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} · Kingsgate Fees` : 'Kingsgate Fees'
    return () => {
      document.title = prev
    }
  }, [title])
}
