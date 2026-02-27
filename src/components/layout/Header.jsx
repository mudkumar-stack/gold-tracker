import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatINR, gainLossClass, formatPct } from '../../utils/formatters.js'

const TAB_LABELS = {
  dashboard:   'Dashboard',
  stocks:      'Stock Holdings',
  mutualfunds: 'Mutual Funds',
  gold:        'Gold & Silver',
  fd:          'Fixed Deposits',
  brokers:     'Connect Brokers',
}

export default function Header() {
  const { activeTab, grandTotal } = usePortfolio()
  const { user } = useAuth()

  const pnl = grandTotal.current - grandTotal.invested
  const pnlPct = grandTotal.invested > 0 ? (pnl / grandTotal.invested) * 100 : 0

  return (
    <header className="main-header">
      <div className="header-left">
        <h2 className="header-title">{TAB_LABELS[activeTab]}</h2>
        <p className="header-subtitle">
          Welcome back, <strong>{user?.name}</strong>
        </p>
      </div>

      {grandTotal.invested > 0 && (
        <div className="header-portfolio-snapshot">
          <div className="snapshot-item">
            <span className="snapshot-label">Total Invested</span>
            <span className="snapshot-value">{formatINR(grandTotal.invested)}</span>
          </div>
          <div className="snapshot-divider" />
          <div className="snapshot-item">
            <span className="snapshot-label">Current Value</span>
            <span className="snapshot-value">{formatINR(grandTotal.current)}</span>
          </div>
          <div className="snapshot-divider" />
          <div className="snapshot-item">
            <span className="snapshot-label">Overall P&L</span>
            <span className={`snapshot-value ${gainLossClass(pnl)}`}>
              {formatINR(pnl)} ({formatPct(pnlPct)})
            </span>
          </div>
        </div>
      )}

      <div className="header-right">
        <div className="header-secure-chip">
          <span>🔒</span> Secure Session
        </div>
        <div className="header-time">
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </header>
  )
}
