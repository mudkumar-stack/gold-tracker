import { useState, useEffect } from 'react'
import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { ZerodhaService } from '../../services/zerodhaService.js'
import { formatINR, formatINRFull, formatPct, gainLossClass } from '../../utils/formatters.js'

export default function StockHoldings() {
  const { zerodha, connectZerodha } = usePortfolio()
  const [holdings, setHoldings] = useState([])
  const [positions, setPositions] = useState([])
  const [orders, setOrders] = useState([])
  const [margins, setMargins] = useState(null)
  const [view, setView] = useState('holdings')
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('pnl')

  useEffect(() => {
    if (!zerodha.connected) return
    setLoading(true)
    Promise.all([
      ZerodhaService.getHoldings(),
      ZerodhaService.getPositions(),
      ZerodhaService.getOrders(),
      ZerodhaService.getMargins(),
    ]).then(([h, p, o, m]) => {
      setHoldings(h)
      setPositions(p)
      setOrders(o)
      setMargins(m)
    }).finally(() => setLoading(false))
  }, [zerodha.connected])

  if (!zerodha.connected) {
    return (
      <div className="not-connected-card">
        <div className="nc-icon">📈</div>
        <h3>Connect Zerodha</h3>
        <p>Link your Zerodha account to view your stock holdings, positions, and orders in real time.</p>
        <button className="auth-btn primary" onClick={connectZerodha} disabled={zerodha.loading}>
          {zerodha.loading ? <><span className="spinner" /> Connecting…</> : 'Connect Zerodha'}
        </button>
        {zerodha.error && <p className="auth-error">{zerodha.error}</p>}
      </div>
    )
  }

  const sortedHoldings = [...holdings].sort((a, b) => {
    if (sortBy === 'pnl')     return b.pnl - a.pnl
    if (sortBy === 'pnl_pct') return b.pnl_pct - a.pnl_pct
    if (sortBy === 'value')   return b.current_value - a.current_value
    if (sortBy === 'symbol')  return a.tradingsymbol.localeCompare(b.tradingsymbol)
    return 0
  })

  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0)
  const totalCurrent  = holdings.reduce((s, h) => s + h.current_value, 0)
  const totalPnL      = totalCurrent - totalInvested

  return (
    <div className="stocks-page">
      {/* Summary Bar */}
      <div className="stocks-summary">
        <SummaryChip label="Invested" value={formatINR(totalInvested)} />
        <SummaryChip label="Current" value={formatINR(totalCurrent)} />
        <SummaryChip label="P&L" value={`${formatINR(totalPnL)} (${formatPct((totalPnL/totalInvested)*100)})`} color={gainLossClass(totalPnL)} />
        {margins && (
          <SummaryChip label="Available Cash" value={formatINR(margins.equity.available.cash)} />
        )}
      </div>

      {/* Tabs */}
      <div className="view-tabs">
        {['holdings', 'positions', 'orders'].map(v => (
          <button key={v} className={`view-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="loading-row"><span className="spinner" /> Loading…</div>}

      {/* Holdings Table */}
      {view === 'holdings' && !loading && (
        <>
          <div className="sort-bar">
            <span>Sort by:</span>
            {[['pnl','P&L ₹'],['pnl_pct','P&L %'],['value','Value'],['symbol','Symbol']].map(([k,l]) => (
              <button key={k} className={`sort-btn ${sortBy === k ? 'active' : ''}`} onClick={() => setSortBy(k)}>{l}</button>
            ))}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Avg Price</th>
                  <th>LTP</th>
                  <th>Invested</th>
                  <th>Current</th>
                  <th>P&L</th>
                  <th>P&L %</th>
                  <th>Day Change</th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map(h => (
                  <tr key={h.tradingsymbol}>
                    <td>
                      <strong>{h.tradingsymbol}</strong>
                      <span className="exchange-badge">{h.exchange}</span>
                    </td>
                    <td>{h.quantity}</td>
                    <td>{formatINRFull(h.average_price)}</td>
                    <td>{formatINRFull(h.last_price)}</td>
                    <td>{formatINR(h.invested)}</td>
                    <td>{formatINR(h.current_value)}</td>
                    <td className={gainLossClass(h.pnl)}>{formatINR(h.pnl)}</td>
                    <td className={gainLossClass(h.pnl_pct)}>{formatPct(h.pnl_pct)}</td>
                    <td className={gainLossClass(h.day_change)}>
                      {h.day_change > 0 ? '+' : ''}{h.day_change.toFixed(2)} ({formatPct(h.day_change_percentage)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Positions */}
      {view === 'positions' && !loading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Symbol</th><th>Product</th><th>Qty</th><th>Avg Price</th><th>LTP</th><th>P&L</th></tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={i}>
                  <td><strong>{p.tradingsymbol}</strong></td>
                  <td><span className={`product-badge ${p.product.toLowerCase()}`}>{p.product}</span></td>
                  <td className={p.quantity < 0 ? 'loss' : 'gain'}>{p.quantity}</td>
                  <td>{formatINRFull(p.average_price)}</td>
                  <td>{formatINRFull(p.last_price)}</td>
                  <td className={gainLossClass(p.pnl)}>{formatINR(p.pnl)}</td>
                </tr>
              ))}
              {positions.length === 0 && <tr><td colSpan={6} className="empty-cell">No open positions</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders */}
      {view === 'orders' && !loading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Order ID</th><th>Symbol</th><th>Type</th><th>Qty</th><th>Price</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.order_id}>
                  <td><code className="order-id">{o.order_id}</code></td>
                  <td><strong>{o.tradingsymbol}</strong></td>
                  <td className={o.transaction_type === 'BUY' ? 'gain' : 'loss'}>{o.transaction_type}</td>
                  <td>{o.quantity}</td>
                  <td>{formatINRFull(o.price)}</td>
                  <td><span className={`status-badge ${o.status.toLowerCase()}`}>{o.status}</span></td>
                  <td>{new Date(o.order_timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
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
