import { log } from './logger.js'
import { config } from '../config.js'

// Email/SMS delivery stub. In production this would call an email provider
// (e.g. Postmark or SES). Here messages go to the server log.
export function sendMail(to, subject, body) {
  log('INFO', 'mail', `to=${to} subject="${subject}"${config.isProd ? '' : ` body="${body}"`}`)
}

/** Outside production, API responses include one-time links/codes so the demo works without email. */
export const exposeDevSecrets = !config.isProd
