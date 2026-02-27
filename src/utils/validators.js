/**
 * Input Validators — Investment Management System
 * Aadhar: Verhoeff checksum algorithm (UIDAI standard)
 * PAN, IFSC, mobile validated per Indian regulations.
 */

// ─── Verhoeff tables ──────────────────────────────────────────────────────────
const V_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const V_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
const V_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

/** Validates Aadhar number using Verhoeff checksum */
export function validateVerhoeff(num) {
  const digits = num.split('').reverse().map(Number)
  let c = 0
  for (let i = 0; i < digits.length; i++) {
    c = V_D[c][V_P[i % 8][digits[i]]]
  }
  return c === 0
}

/** Full Aadhar validation: 12 digits + Verhoeff checksum */
export function validateAadhar(raw) {
  const num = raw.replace(/\s/g, '')
  if (!/^\d{12}$/.test(num)) return { valid: false, error: 'Aadhar must be exactly 12 digits' }
  // First digit cannot be 0 or 1 per UIDAI spec
  if (['0', '1'].includes(num[0])) return { valid: false, error: 'Invalid Aadhar number' }
  if (!validateVerhoeff(num)) return { valid: false, error: 'Invalid Aadhar checksum' }
  return { valid: true }
}

/** Indian mobile number: starts with 6-9, 10 digits */
export function validateMobile(mob) {
  const num = mob.replace(/\D/g, '')
  if (!/^[6-9]\d{9}$/.test(num)) return { valid: false, error: 'Enter valid 10-digit Indian mobile number' }
  return { valid: true }
}

/** PAN number: AAAAA9999A format */
export function validatePAN(pan) {
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())) {
    return { valid: false, error: 'Invalid PAN format (e.g. ABCDE1234F)' }
  }
  return { valid: true }
}

/** IFSC code: 4 alpha + 0 + 6 alphanumeric */
export function validateIFSC(ifsc) {
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
    return { valid: false, error: 'Invalid IFSC code' }
  }
  return { valid: true }
}

/** OTP: 6 digits */
export function validateOTP(otp) {
  if (!/^\d{6}$/.test(otp)) return { valid: false, error: 'OTP must be 6 digits' }
  return { valid: true }
}

/** Format Aadhar for display: groups of 4 */
export function formatAadharInput(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}
