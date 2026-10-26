export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export const badRequest = (message, extra) => new HttpError(400, 'bad_request', message, extra)
export const unauthorized = (message = 'Please sign in to continue.') => new HttpError(401, 'unauthorized', message)
export const forbidden = (message = 'You don’t have permission to do that.') => new HttpError(403, 'forbidden', message)
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message)
export const conflict = (code, message, extra) => new HttpError(409, code, message, extra)
