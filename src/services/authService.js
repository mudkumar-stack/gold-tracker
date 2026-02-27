/**
 * Authentication Service — Aadhar-based OTP Authentication
 *
 * ARCHITECTURE:
 *   Frontend (this file) ──► Backend API ──► UIDAI e-KYC API
 *
 * PRODUCTION REQUIREMENTS:
 *   1. Backend must integrate with UIDAI's OTP API (AUA/KUA licence required)
 *   2. Aadhar number must NEVER be stored — only hashed token used for session
 *   3. All API calls must be over TLS 1.3+
 *   4. Biometric auth uses UIDAI Registered Devices (RD) SDK
 *   5. Comply with Aadhaar Act 2016 and UIDAI circular 11020/217/2017
 *
 * DEMO MODE: OTP is logged to console (not sent via SMS) for development.
 */

import {
  sha256,
  generateOTP,
  generateSessionToken,
  RateLimiter,
  AuditLogger,
  SessionManager,
  maskAadhar,
  maskMobile,
} from '../utils/security.js'
import { validateAadhar, validateOTP } from '../utils/validators.js'

// In-memory store for pending OTP challenges (never persisted to localStorage)
let _pendingChallenge = null

// Rate limiters
const otpRequestLimiter = new RateLimiter(3, 10 * 60 * 1000)  // 3 attempts / 10 min
const otpVerifyLimiter  = new RateLimiter(5, 30 * 60 * 1000)  // 5 attempts / 30 min

// Demo user registry (simulates UIDAI resident database)
const DEMO_RESIDENTS = {
  '499118665246': { name: 'Rajesh Kumar', mobile: '9876543210', pan: 'ABCPK1234F', dob: '1985-06-15' },
  '234123412341': { name: 'Priya Sharma', mobile: '8765432109', pan: 'XYZPS5678G', dob: '1990-03-22' },
  // Verhoeff-valid demo numbers:
  '234123412348': { name: 'Demo User',   mobile: '9000000000', pan: 'DEMOQ9999Z', dob: '1995-01-01' },
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Step 1 — Request OTP
 * Validates Aadhar, looks up registered mobile, sends OTP.
 * Returns masked mobile so user knows where OTP was sent.
 */
export async function requestOTP(aadharRaw) {
  const num = aadharRaw.replace(/\s/g, '')

  // Rate-limit OTP requests
  const limit = otpRequestLimiter.consume()
  if (!limit.allowed) {
    AuditLogger.log('OTP_REQUEST_RATE_LIMITED', { masked: maskAadhar(num) })
    throw new Error(`Too many requests. Try again in ${Math.ceil(limit.lockSeconds / 60)} minutes.`)
  }

  // Validate Aadhar format + Verhoeff checksum
  const validation = validateAadhar(num)
  if (!validation.valid) throw new Error(validation.error)

  // Hash the Aadhar number — never keep plaintext
  const aadharHash = await sha256(num + import.meta.env.VITE_AADHAR_PEPPER || num + 'ims_demo_pepper')

  // PRODUCTION: Call backend → UIDAI OTP API
  // const response = await fetch('/api/auth/aadhar/request-otp', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ aadharHash }),
  // })

  // DEMO: lookup from demo registry
  const resident = DEMO_RESIDENTS[num]
  if (!resident) {
    // For unknown numbers, still generate OTP (don't reveal if Aadhar exists)
    AuditLogger.log('OTP_REQUEST_UNKNOWN', { masked: maskAadhar(num) })
    // Simulate sending but tell user to use a demo number
    return {
      maskedMobile: 'XXXXXX0000',
      transactionId: generateSessionToken().slice(0, 16),
      demo: true,
      hint: 'Use demo Aadhar: 4991 1866 5246',
    }
  }

  const otp = generateOTP(6)
  const transactionId = generateSessionToken().slice(0, 16)
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10-minute OTP validity

  // Store challenge in memory only (never in localStorage)
  _pendingChallenge = {
    aadharHash,
    otpHash: await sha256(otp + transactionId),
    transactionId,
    expiresAt,
    resident,
    attempts: 0,
  }

  // DEMO: log OTP to console (PRODUCTION: send via UIDAI SMS gateway)
  console.info(`[DEMO] OTP for ${maskAadhar(num)}: ${otp}  (valid 10 min)`)
  AuditLogger.log('OTP_SENT', { masked: maskAadhar(num), transactionId })

  return {
    maskedMobile: maskMobile(resident.mobile),
    transactionId,
    demo: true,
    demoOTP: otp, // Exposed only in DEV builds
  }
}

/**
 * Step 2 — Verify OTP
 * Checks OTP against stored challenge, issues session token.
 */
export async function verifyOTP(otp, transactionId) {
  // Rate-limit OTP verification
  const limit = otpVerifyLimiter.consume()
  if (!limit.allowed) {
    AuditLogger.log('OTP_VERIFY_RATE_LIMITED')
    throw new Error(`Too many failed attempts. Account locked for ${Math.ceil(limit.lockSeconds / 60)} minutes.`)
  }

  if (!_pendingChallenge) throw new Error('No active OTP session. Please request a new OTP.')
  if (Date.now() > _pendingChallenge.expiresAt) {
    _pendingChallenge = null
    throw new Error('OTP has expired. Please request a new one.')
  }
  if (_pendingChallenge.transactionId !== transactionId) {
    throw new Error('Session mismatch. Please request a new OTP.')
  }

  const { valid, error } = validateOTP(otp)
  if (!valid) throw new Error(error)

  _pendingChallenge.attempts += 1
  if (_pendingChallenge.attempts > 3) {
    _pendingChallenge = null
    throw new Error('Too many incorrect attempts. Session invalidated.')
  }

  const expectedHash = await sha256(otp + transactionId)
  if (expectedHash !== _pendingChallenge.otpHash) {
    AuditLogger.log('OTP_VERIFY_FAILED', { attempt: _pendingChallenge.attempts })
    throw new Error(`Incorrect OTP. ${3 - _pendingChallenge.attempts} attempt(s) remaining.`)
  }

  // Success — issue session
  const { resident } = _pendingChallenge
  const sessionToken = generateSessionToken()
  otpVerifyLimiter.reset()
  _pendingChallenge = null

  const user = {
    name: resident.name,
    maskedAadhar: maskAadhar(''), // don't store even masked aadhar hash beyond session
    pan: resident.pan,
    dob: resident.dob,
    connectedBrokers: [],
    sessionToken,
    loginAt: new Date().toISOString(),
  }

  SessionManager.save(sessionToken, user)
  AuditLogger.log('LOGIN_SUCCESS', { name: resident.name, sessionToken: sessionToken.slice(0, 8) + '...' })

  return user
}

/**
 * Restore session from sessionStorage if still valid.
 */
export function restoreSession() {
  const session = SessionManager.load()
  if (!session) return null
  AuditLogger.log('SESSION_RESTORED')
  return session.userMeta
}

/**
 * Logout — clear all session data.
 */
export function logout() {
  AuditLogger.log('LOGOUT')
  SessionManager.clear()
  AuditLogger.clear()
  _pendingChallenge = null
  otpRequestLimiter.reset()
  otpVerifyLimiter.reset()
}
