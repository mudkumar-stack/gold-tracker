import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatAadharInput } from '../../utils/validators.js'

export default function AadharLogin() {
  const { sendOTP, phase, error } = useAuth()
  const [aadhar, setAadhar] = useState('')
  const [consent, setConsent] = useState(false)

  const isLoading = phase === 'requesting'

  function handleInput(e) {
    setAadhar(formatAadharInput(e.target.value))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!consent) return
    sendOTP(aadhar)
  }

  const digits = aadhar.replace(/\s/g, '')
  const ready = digits.length === 12 && consent

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <div className="auth-logo-icon">₹</div>
        <h1 className="auth-brand">InvestSecure</h1>
        <p className="auth-tagline">India's Unified Investment Platform</p>
      </div>

      <div className="auth-security-badge">
        <span className="badge-icon">🔒</span>
        <span>Secured by Aadhar e-KYC · AES-256 Encrypted</span>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
        <div className="form-group">
          <label className="form-label">Aadhar Number</label>
          <div className="aadhar-input-wrap">
            <span className="aadhar-prefix-icon">🪪</span>
            <input
              className="form-input aadhar-input"
              type="text"
              inputMode="numeric"
              placeholder="XXXX XXXX XXXX"
              value={aadhar}
              onChange={handleInput}
              maxLength={14}
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
              aria-label="Aadhar number"
            />
            {digits.length === 12 && (
              <span className="input-valid-icon">✓</span>
            )}
          </div>
          <p className="form-hint">
            Your 12-digit Aadhar number. OTP will be sent to your registered mobile.
          </p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <label className="consent-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            disabled={isLoading}
          />
          <span>
            I consent to authenticate using my Aadhar data as per{' '}
            <a href="https://uidai.gov.in" target="_blank" rel="noopener noreferrer" className="auth-link">
              UIDAI guidelines
            </a>{' '}
            and authorise InvestSecure to access my KYC details.
          </span>
        </label>

        <button
          type="submit"
          className="auth-btn primary"
          disabled={!ready || isLoading}
        >
          {isLoading ? (
            <><span className="spinner" /> Sending OTP…</>
          ) : (
            'Get OTP on Mobile'
          )}
        </button>
      </form>

      <div className="auth-security-info">
        <div className="security-item"><span>🛡️</span><span>End-to-end encrypted</span></div>
        <div className="security-item"><span>🏛️</span><span>UIDAI certified</span></div>
        <div className="security-item"><span>🔐</span><span>Zero data stored</span></div>
      </div>

      <p className="auth-disclaimer">
        InvestSecure is an investment aggregator. By logging in you agree to our{' '}
        <a href="#" className="auth-link">Terms of Service</a> and{' '}
        <a href="#" className="auth-link">Privacy Policy</a>.
        <br />
        <strong>Demo:</strong> Use Aadhar <code>4991 1866 5246</code>
      </p>
    </div>
  )
}
