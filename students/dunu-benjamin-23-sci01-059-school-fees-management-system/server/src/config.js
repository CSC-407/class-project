import 'dotenv/config'

const env = process.env

export const config = {
  env: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT || 4000),
  allowedOrigins: (env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  bcryptRounds: Number(env.BCRYPT_ROUNDS || 12),
  demoOtp: env.DEMO_OTP || '',
  idleMinutes: Number(env.SESSION_IDLE_MINUTES || 10),
  cookieSecure: env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production',
  maxLoginAttempts: 5,
  lockoutMinutes: 5,
  currentSession: '2025/2026',
  serviceChargeRate: 0.015,
  serviceChargeCap: 2000,
  minInstallment: 10000,
}

if (config.isProd && config.demoOtp) {
  console.warn('[config] DEMO_OTP is set in production. Unset it to use random one-time codes.')
}
