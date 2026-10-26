// Structured logger with an in-memory ring buffer for the System Health log viewer.
const buffer = []
const MAX = 300

export function log(level, source, message) {
  const entry = { at: new Date().toISOString(), level, source, message }
  buffer.push(entry)
  if (buffer.length > MAX) buffer.shift()
  if (process.env.NODE_ENV !== 'test') {
    const line = `${entry.at} ${level.padEnd(5)} [${source}] ${message}`
    level === 'ERROR' ? console.error(line) : console.log(line)
  }
}

export const recentLogs = (n = 100) => buffer.slice(-n).reverse()
