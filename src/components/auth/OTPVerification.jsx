import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function OTPVerification() {
  const { confirmOTP, sendOTP, goBack, phase, error, maskedMobile, transactionId, demoOTP } = useAuth()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [resendCooldown, setResendCooldown] = useState(30)
  const refs = useRef([])
  const isVerifying = phase === 'verifying'

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  function handleDigit(idx, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[idx] = val
    setDigits(next)
    if (val && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus()
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setDigits(text.split(''))
      refs.current[5]?.focus()
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length === 6) confirmOTP(otp)
  }

  function handleResend() {
    if (resendCooldown > 0) return
    setDigits(['', '', '', '', '', ''])
    setResendCooldown(30)
    // re-trigger OTP (would need aadhar stored — in real app this comes from state/context)
    // goBack() allows user to re-enter Aadhar
    goBack()
  }

  const otp = digits.join('')
  const ready = otp.length === 6

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (ready && !isVerifying) confirmOTP(otp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, otp])

  return (
    <div className="auth-card">
      <button className="auth-back-btn" onClick={goBack} aria-label="Go back">
        ← Back
      </button>

      <div className="auth-logo">
        <div className="auth-logo-icon otp-icon">📱</div>
        <h2 className="auth-brand">Verify OTP</h2>
        <p className="auth-tagline">
          OTP sent to <strong>{maskedMobile}</strong>
        </p>
      </div>

      {demoOTP && (
        <div className="demo-otp-banner">
          <span>🧪 Demo OTP:</span>
          <strong
            className="demo-otp-value"
            onClick={() => setDigits(demoOTP.split(''))}
            title="Click to auto-fill"
          >
            {demoOTP}
          </strong>
          <span className="demo-otp-hint">(click to fill)</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="otp-boxes" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => (refs.current[i] = el)}
              className={`otp-box ${d ? 'filled' : ''} ${error ? 'error' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={isVerifying}
              autoFocus={i === 0}
              aria-label={`OTP digit ${i + 1}`}
            />
          ))}
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          type="submit"
          className="auth-btn primary"
          disabled={!ready || isVerifying}
        >
          {isVerifying ? (
            <><span className="spinner" /> Verifying…</>
          ) : (
            'Verify & Login'
          )}
        </button>

        <div className="otp-resend">
          {resendCooldown > 0 ? (
            <span className="resend-timer">Resend OTP in {resendCooldown}s</span>
          ) : (
            <button type="button" className="auth-link-btn" onClick={handleResend}>
              Resend OTP
            </button>
          )}
        </div>
      </form>

      <p className="auth-disclaimer">
        OTP is valid for 10 minutes. Do not share it with anyone.
        <br />
        Transaction ID: <code className="txn-id">{transactionId?.slice(0, 8)}…</code>
      </p>
    </div>
  )
}
