import { useState, useEffect } from 'react'
import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { GrowwService } from '../../services/growwService.js'
import { formatINR, formatPct, gainLossClass, formatDate } from '../../utils/formatters.js'

export default function MutualFunds() {
  const { groww, connectGroww } = usePortfolio()
  const [holdings, setHoldings] = useState([])
  const [sips, setSIPs] = useState([])
  const [txns, setTxns] = useState([])
  const [view, setView] = useState('holdings')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (!groww.connected) return
    setLoading(true)
    Promise.all([
      GrowwService.getMFHoldings(),
      GrowwService.getUpcomingSIPs(),
      GrowwService.getTransactions(),
    ]).then(([h, s, t]) => {
      setHoldings(h)
      setSIPs(s)
      setTxns(t)
    }).finally(() => setLoading(false))
  }, [groww.connected])

  if (!groww.connected) {
    return (
      <div className="not-connected-card">
        <div className="nc-icon">🏦</div>
        <h3>Connect Groww</h3>
        <p>Link your Groww account to view mutual fund holdings, SIPs, and transaction history.</p>
        <button className="auth-btn primary" onClick={connectGroww} disabled={groww.loading}>
          {groww.loading ? <><span className="spinner" /> Connecting…</> : 'Connect Groww'}
        </button>
        {groww.error && <p className="auth-error">{groww.error}</p>}
      </div>
    )
  }

  const categories = ['All', ...new Set(holdings.map(h => h.category.split('—')[0].trim()))]
  const filtered = filter === 'All' ? holdings : holdings.filter(h => h.category.includes(filter))

  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0)
  const totalCurrent  = holdings.reduce((s, h) => s + h.current_value, 0)
  const totalSIPMonthly = sips.reduce((s, sp) => s + sp.amount, 0)

  return (
    <div className="mf-page">
      {/* Summary */}
      <div className="stocks-summary">
        <SummaryChip label="Invested" value={formatINR(totalInvested)} />
        <SummaryChip label="Current" value={formatINR(totalCurrent)} />
        <SummaryChip label="P&L" value={`${formatINR(totalCurrent-totalInvested)} (${formatPct(((totalCurrent-totalInvested)/totalInvested)*100)})`} color={gainLossClass(totalCurrent-totalInvested)} />
        <SummaryChip label="Monthly SIP" value={formatINR(totalSIPMonthly)} />
        <SummaryChip label="Funds" value={holdings.length} />
      </div>

      {/* Tabs */}
      <div className="view-tabs">
        {['holdings','sips','transactions'].map(v => (
          <button key={v} className={`view-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
            {v === 'sips' ? 'Active SIPs' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="loading-row"><span className="spinner" /> Loading…</div>}

      {view === 'holdings' && !loading && (
        <>
          <div className="sort-bar">
            {categories.map(c => (
              <button key={c} className={`sort-btn ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="mf-cards">
            {filtered.map((mf, i) => (
              <div key={i} className="mf-card">
                <div className="mf-card-header">
                  <div>
                    <p className="mf-name">{mf.scheme_name}</p>
                    <p className="mf-meta">{mf.amc} · <span className="category-chip">{mf.category}</span></p>
                  </div>
                  <div className={`mf-return ${gainLossClass(mf.pnl_pct)}`}>
                    {formatPct(mf.pnl_pct)}
                  </div>
                </div>
                <div className="mf-metrics">
                  <div className="mf-metric">
                    <span className="mf-metric-label">Invested</span>
                    <span className="mf-metric-value">{formatINR(mf.invested)}</span>
                  </div>
                  <div className="mf-metric">
                    <span className="mf-metric-label">Current</span>
                    <span className="mf-metric-value">{formatINR(mf.current_value)}</span>
                  </div>
                  <div className="mf-metric">
                    <span className="mf-metric-label">Gain/Loss</span>
                    <span className={`mf-metric-value ${gainLossClass(mf.pnl)}`}>{formatINR(mf.pnl)}</span>
                  </div>
                  <div className="mf-metric">
                    <span className="mf-metric-label">Units</span>
                    <span className="mf-metric-value">{mf.units.toFixed(3)}</span>
                  </div>
                  <div className="mf-metric">
                    <span className="mf-metric-label">NAV</span>
                    <span className="mf-metric-value">₹{mf.nav.toFixed(4)}</span>
                  </div>
                  {mf.sip_amount > 0 && (
                    <div className="mf-metric">
                      <span className="mf-metric-label">SIP</span>
                      <span className="mf-metric-value sip-badge">{formatINR(mf.sip_amount)}/mo</span>
                    </div>
                  )}
                </div>
                <div className="mf-footer">
                  <span>Folio: {mf.folio}</span>
                  <span>Since {formatDate(mf.start_date)}</span>
                  <span>ISIN: {mf.isin.slice(0, 6)}…</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'sips' && !loading && (
        <div className="sip-list">
          {sips.map((s, i) => (
            <div key={i} className="sip-item">
              <div className="sip-info">
                <p className="sip-name">{s.scheme_name}</p>
                <p className="sip-bank">{s.bank}</p>
              </div>
              <div className="sip-amount">{formatINR(s.amount)}<span>/mo</span></div>
              <div className="sip-next">
                <span className="sip-label">Next SIP</span>
                <span className="sip-date">{formatDate(s.next_date)}</span>
              </div>
              <span className="sip-status active">Active</span>
            </div>
          ))}
        </div>
      )}

      {view === 'transactions' && !loading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Fund</th><th>Type</th><th>Amount</th><th>Units</th><th>NAV</th><th>Status</th></tr>
            </thead>
            <tbody>
              {txns.map((t, i) => (
                <tr key={i}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.scheme}</td>
                  <td>{t.type}</td>
                  <td>{formatINR(t.amount)}</td>
                  <td>{t.units.toFixed(3)}</td>
                  <td>₹{t.nav.toFixed(4)}</td>
                  <td><span className="status-badge complete">{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryChip({ label, value, color }) {
  return (
    <div className="summary-chip">
      <span className="sc-label">{label}</span>
      <span className={`sc-value ${color || ''}`}>{value}</span>
    </div>
  )
}
