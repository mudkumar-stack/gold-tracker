/**
 * Security Utilities — Investment Management System
 * Uses browser-native Web Crypto API (no external dependencies).
 * AES-256-GCM for encryption, PBKDF2 for key derivation, SHA-256 for hashing.
 *
 * PRODUCTION NOTE: Aadhar auth must be proxied through a backend that
 * calls UIDAI e-KYC APIs. Never expose Aadhar numbers to frontend storage.
 */

const ALGO = 'AES-GCM'
const KEY_LEN = 256
const IV_LEN = 12
const PBKDF2_ITER = 310_000 // OWASP 2023 recommended minimum

// ─── Encryption ──────────────────────────────────────────────────────────────

export async function generateSessionKey() {
  return crypto.subtle.generateKey({ name: ALGO, length: KEY_LEN }, false, ['encrypt', 'decrypt'])
}

export async function deriveKey(secret, salt) {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITER, hash: 'SHA-256' },
    base,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(JSON.stringify(data)))
  const buf = new Uint8Array(IV_LEN + ct.byteLength)
  buf.set(iv)
  buf.set(new Uint8Array(ct), IV_LEN)
  return btoa(String.fromCharCode(...buf))
}

export async function decryptData(b64, key) {
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const iv = buf.slice(0, IV_LEN)
  const ct = buf.slice(IV_LEN)
  const pt = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(pt))
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Token & OTP ─────────────────────────────────────────────────────────────

export function generateSessionToken() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateOTP(len = 6) {
  // Cryptographically secure OTP
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 10 ** len).padStart(len, '0')
}

// ─── Masking ─────────────────────────────────────────────────────────────────

export function maskAadhar(num) {
  if (!num || num.length !== 12) return 'XXXX XXXX XXXX'
  return `XXXX XXXX ${num.slice(8)}`
}

export function maskMobile(mob) {
  if (!mob) return '**XXXXXX**'
  const s = mob.replace(/\D/g, '')
  return s.slice(0, 2) + 'XXXXXX' + s.slice(-2)
}

export function maskPAN(pan) {
  if (!pan || pan.length !== 10) return 'XXXXX####X'
  return pan.slice(0, 5).replace(/./g, 'X') + pan.slice(5, 9) + pan.slice(-1)
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 30 * 60 * 1000) {
    this.max = maxAttempts
    this.window = windowMs
    this.attempts = []
    this.lockUntil = null
  }

  /** @returns {false | number} false if allowed, seconds remaining if locked */
  isLocked() {
    if (this.lockUntil && Date.now() < this.lockUntil) {
      return Math.ceil((this.lockUntil - Date.now()) / 1000)
    }
    this.lockUntil = null
    return false
  }

  /** @returns {{ allowed: boolean, remaining?: number, lockSeconds?: number }} */
  consume() {
    const locked = this.isLocked()
    if (locked) return { allowed: false, lockSeconds: locked }

    const now = Date.now()
    this.attempts = this.attempts.filter(t => now - t < this.window)
    this.attempts.push(now)

    if (this.attempts.length >= this.max) {
      this.lockUntil = now + this.window
      this.attempts = []
      return { allowed: false, lockSeconds: Math.ceil(this.window / 1000) }
    }
    return { allowed: true, remaining: this.max - this.attempts.length }
  }

  reset() {
    this.attempts = []
    this.lockUntil = null
  }
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────

const AUDIT_KEY = 'ims_audit_log'

export const AuditLogger = {
  log(event, meta = {}) {
    const entry = {
      ts: new Date().toISOString(),
      event,
      ua: navigator.userAgent.slice(0, 80),
      ...meta,
    }
    const logs = this.getLogs()
    logs.push(entry)
    try { sessionStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(-200))) } catch {}
    if (import.meta.env.DEV) console.info('[AUDIT]', entry)
  },
  getLogs() {
    try { return JSON.parse(sessionStorage.getItem(AUDIT_KEY) || '[]') } catch { return [] }
  },
  clear() { sessionStorage.removeItem(AUDIT_KEY) },
}

// ─── Session ─────────────────────────────────────────────────────────────────

const SESSION_KEY = 'ims_session'
const SESSION_TTL = 30 * 60 * 1000 // 30 minutes

export const SessionManager = {
  save(token, userMeta) {
    const payload = { token, userMeta, expiresAt: Date.now() + SESSION_TTL }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  },
  load() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const payload = JSON.parse(raw)
      if (Date.now() > payload.expiresAt) { this.clear(); return null }
      // Slide expiry on activity
      payload.expiresAt = Date.now() + SESSION_TTL
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
      return payload
    } catch { return null }
  },
  clear() { sessionStorage.removeItem(SESSION_KEY) },
  isExpired() { return this.load() === null },
}
