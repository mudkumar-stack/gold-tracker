import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { AuditLogger } from '../../utils/security.js'

const BROKERS = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    logo: '🟢',
    desc: 'India\'s largest stockbroker. Kite Connect API for real-time holdings, orders, P&L.',
    features: ['Equity Holdings', 'F&O Positions', 'Orders', 'Margin Details'],
    color: '#387ed1',
    tag: 'Stocks',
    docs: 'https://kite.trade/docs',
  },
  {
    id: 'groww',
    name: 'Groww',
    logo: '🌱',
    desc: 'Mutual funds, direct stocks, and SIP management. MF Central & BSE StarMF integration.',
    features: ['Mutual Funds', 'Stocks', 'SIP Tracking', 'Transaction History'],
    color: '#00d17c',
    tag: 'MF + Stocks',
    docs: 'https://groww.in',
  },
  {
    id: 'mfcentral',
    name: 'MF Central',
    logo: '🏛️',
    desc: 'Official CAS (Consolidated Account Statement) aggregator by CAMS & KFintech.',
    features: ['All MF Houses', 'CAS Import', 'Capital Gains', 'Tax Statement'],
    color: '#ff6b35',
    tag: 'Mutual Funds',
    comingSoon: true,
  },
  {
    id: 'nps',
    name: 'NPS / PRAN',
    logo: '📋',
    desc: 'National Pension Scheme via PFRDA. Import via PRAN number.',
    features: ['Pension Corpus', 'Tier I & II', 'Annuity Tracking'],
    color: '#17c3b2',
    tag: 'Pension',
    comingSoon: true,
  },
  {
    id: 'indiapost',
    name: 'India Post',
    logo: '📮',
    desc: 'NSC, KVP, Sukanya Samriddhi and other postal schemes.',
    features: ['NSC', 'KVP', 'Sukanya', 'Senior Citizen Scheme'],
    color: '#a855f7',
    tag: 'Small Savings',
    comingSoon: true,
  },
  {
    id: 'creds',
    name: 'Account Aggregator',
    logo: '🔗',
    desc: 'RBI\'s Account Aggregator (AA) framework — consent-based open financial data.',
    features: ['Bank Accounts', 'Insurance', 'Mutual Funds', 'NPS'],
    color: '#ffd700',
    tag: 'All Institutions',
    comingSoon: true,
  },
]

export default function BrokerConnect() {
  const { zerodha, groww, connectZerodha, disconnectZerodha, connectGroww, disconnectGroww } = usePortfolio()

  function handleConnect(id) {
    AuditLogger.log('BROKER_CONNECT_ATTEMPT', { broker: id })
    if (id === 'zerodha') connectZerodha()
    if (id === 'groww')   connectGroww()
  }

  function handleDisconnect(id) {
    AuditLogger.log('BROKER_DISCONNECT', { broker: id })
    if (id === 'zerodha') disconnectZerodha()
    if (id === 'groww')   disconnectGroww()
  }

  function isConnected(id) {
    if (id === 'zerodha') return zerodha.connected
    if (id === 'groww')   return groww.connected
    return false
  }

  function isLoading(id) {
    if (id === 'zerodha') return zerodha.loading
    if (id === 'groww')   return groww.loading
    return false
  }

  function getError(id) {
    if (id === 'zerodha') return zerodha.error
    if (id === 'groww')   return groww.error
    return null
  }

  return (
    <div className="brokers-page">
      <div className="brokers-intro">
        <div className="intro-icon">🔐</div>
        <div>
          <h3>Secure Broker Integration</h3>
          <p>
            All connections use OAuth 2.0 / API keys via your backend.
            Credentials are never stored in the browser.
            Your Aadhar identity is used for KYC matching only.
          </p>
        </div>
      </div>

      <div className="security-checklist">
        {[
          '🔒 OAuth 2.0 authentication — no passwords stored',
          '🛡️ Read-only API access (no trading from this app)',
          '🔑 Access tokens expire automatically',
          '📋 All connections logged in audit trail',
          '🚫 Aadhar number never stored or transmitted to brokers',
        ].map((item, i) => (
          <div key={i} className="security-check-item">{item}</div>
        ))}
      </div>

      <div className="brokers-grid">
        {BROKERS.map(broker => {
          const connected = isConnected(broker.id)
          const loading   = isLoading(broker.id)
          const err       = getError(broker.id)

          return (
            <div
              key={broker.id}
              className={`broker-card ${connected ? 'connected' : ''} ${broker.comingSoon ? 'coming-soon' : ''}`}
              style={{ borderTop: `3px solid ${broker.color}` }}
            >
              <div className="broker-card-header">
                <span className="broker-logo">{broker.logo}</span>
                <div>
                  <h4 className="broker-name">{broker.name}</h4>
                  <span className="broker-tag">{broker.tag}</span>
                </div>
                {connected && <span className="connected-badge">● Connected</span>}
                {broker.comingSoon && <span className="soon-badge">Coming Soon</span>}
              </div>

              <p className="broker-desc">{broker.desc}</p>

              <ul className="broker-features">
                {broker.features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>

              {err && <p className="auth-error small">{err}</p>}

              {!broker.comingSoon && (
                <div className="broker-actions">
                  {connected ? (
                    <>
                      <span className="connected-status">✓ Account linked</span>
                      <button
                        className="auth-btn secondary small"
                        onClick={() => handleDisconnect(broker.id)}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      className="auth-btn primary small"
                      onClick={() => handleConnect(broker.id)}
                      disabled={loading}
                    >
                      {loading ? <><span className="spinner" /> Connecting…</> : `Connect ${broker.name}`}
                    </button>
                  )}
                </div>
              )}

              {broker.comingSoon && (
                <button className="auth-btn secondary small" disabled>
                  Coming Soon
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* How Integration Works */}
      <div className="card integration-flow">
        <h3 className="card-title">How Broker Integration Works</h3>
        <div className="flow-steps">
          {[
            { step: '1', title: 'Aadhar Authentication', desc: 'You log in with Aadhar OTP. Your identity is verified by UIDAI.' },
            { step: '2', title: 'Broker OAuth', desc: 'You are redirected to the broker\'s login page. We never see your password.' },
            { step: '3', title: 'Access Token Issued', desc: 'The broker issues a read-only access token to our backend.' },
            { step: '4', title: 'Data Fetched Securely', desc: 'Your portfolio is fetched via the broker\'s API and displayed here.' },
            { step: '5', title: 'No Persistent Storage', desc: 'Access tokens expire. We don\'t store your financial data on our servers.' },
          ].map(s => (
            <div key={s.step} className="flow-step">
              <div className="flow-step-num">{s.step}</div>
              <div>
                <p className="flow-step-title">{s.title}</p>
                <p className="flow-step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
