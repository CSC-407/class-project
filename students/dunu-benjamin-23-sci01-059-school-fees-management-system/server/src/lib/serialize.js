// Shapes database rows into API responses. Secrets never leave this layer.

export function publicUser(u) {
  if (!u) return null
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    matric: u.matric,
    staffId: u.staffId,
    title: u.title,
    phone: u.phone,
    address: u.address,
    photo: u.photo,
    faculty: u.faculty,
    department: u.department,
    level: u.level,
    verified: u.verified,
    twoFactor: u.twoFactor,
    status: u.status,
  }
}

export function paymentOut(p, { admin = false } = {}) {
  const out = {
    id: p.id,
    ref: p.ref,
    receiptNo: p.receiptNo,
    date: p.createdAt,
    items: (p.items || []).map((i) => ({ feeId: i.feeItemId, name: i.name, amount: i.amount })),
    description: (p.items || []).map((i) => i.name).join(', '),
    amount: p.amount,
    serviceCharge: p.serviceCharge,
    method: p.method,
    last4: p.last4,
    status: p.status,
    session: p.session,
    failureReason: p.failureReason,
    refunded: p.refunded,
    timeline: JSON.parse(p.timeline || '[]'),
  }
  if (admin) {
    Object.assign(out, {
      studentId: p.studentId,
      student: p.student?.name,
      matric: p.student?.matric,
      faculty: p.student?.faculty,
      verification: p.verification,
      flagged: p.flagged,
      flagReason: p.flagReason,
      refundReason: p.refundReason,
      gateway: {
        provider: 'SandboxPay (Test Mode)',
        code: p.gatewayCode,
        message: p.gatewayMessage,
        authCode: p.authCode,
        channel: p.channel,
        ip: p.ip,
      },
    })
  }
  return out
}

export const notificationOut = (n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, read: n.read, at: n.createdAt })
