import { useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { formatINR, formatPct, gainLossClass } from '../../utils/formatters.js'

const COLORS = ['#7c6ff7', '#00d17c', '#ffd700', '#ff6b35', '#17c3b2']

export default function Dashboard() {
  const { zerodha, groww, fd, ppf, totals, grandTotal, loadFDPPF } = usePortfolio()

  useEffect(() => { loadFDPPF() }, [loadFDPPF])

  const pieData = [
    totals.zerodha && { name: 'Zerodha Stocks', value: Math.round(totals.zerodha.current) },
    totals.groww   && { name: 'Groww MF + Stocks', value: Math.round(totals.groww.current) },
    totals.fd      && { name: 'Fixed Deposits', value: totals.fd.current },
    totals.ppf     && { name: 'PPF', value: totals.ppf.current },
    // Gold is tracked separately via the metal tracker
  ].filter(Boolean)

  const totalPnL = grandTotal.current - grandTotal.invested
  const totalPnLPct = grandTotal.invested > 0 ? (totalPnL / grandTotal.invested) * 100 : 0

  return (
    <div className="dashboard">
      {/* Grand Total Banner */}
      <div className="total-banner">
        <div className="total-banner-left">
          <p className="total-label">Total Portfolio Value</p>
          <h2 className="total-value">{formatINR(grandTotal.current) || '₹0'}</h2>
          <p className={`total-pnl ${gainLossClass(totalPnL)}`}>
            {formatINR(totalPnL)} ({formatPct(totalPnLPct)}) overall return
          </p>
        </div>
        <div className="total-banner-right">
          <div className="total-stat">
            <span className="total-stat-label">Invested</span>
            <span className="total-stat-value">{formatINR(grandTotal.invested)}</span>
          </div>
          <div className="total-stat">
            <span className="total-stat-label">Current</span>
            <span className="total-stat-value">{formatINR(grandTotal.current)}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Allocation Pie */}
        <div className="card">
          <h3 className="card-title">Asset Allocation</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1c2033', border: '1px solid #2a2e45', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [formatINR(v), '']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={v => <span style={{ color: '#aaa', fontSize: 11 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Connect brokers to see allocation" />
          )}
        </div>

        {/* Portfolio Cards */}
        <div className="portfolio-cards-grid">
          <PortfolioCard
            icon="📈" label="Zerodha" subtitle="Stocks & Derivatives"
            data={totals.zerodha} connected={zerodha.connected} loading={zerodha.loading}
            color="#7c6ff7"
          />
          <PortfolioCard
            icon="🏦" label="Groww" subtitle="Mutual Funds & Stocks"
            data={totals.groww} connected={groww.connected} loading={groww.loading}
            color="#00d17c"
          />
          <PortfolioCard
            icon="🏛️" label="Fixed Deposits" subtitle="Bank FDs"
            data={totals.fd ? { invested: totals.fd.invested, current: totals.fd.current, pnl: totals.fd.current - totals.fd.invested, pnlPct: ((totals.fd.current - totals.fd.invested) / totals.fd.invested) * 100 } : null}
            connected={!!fd.data} loading={false}
            color="#ffd700"
          />
          <PortfolioCard
            icon="🏦" label="PPF" subtitle="Public Provident Fund"
            data={totals.ppf ? { invested: totals.ppf.invested, current: totals.ppf.current, pnl: totals.ppf.current - totals.ppf.invested, pnlPct: ((totals.ppf.current - totals.ppf.invested) / totals.ppf.invested) * 100 } : null}
            connected={!!ppf.data} loading={false}
            color="#17c3b2"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card quick-actions">
        <h3 className="card-title">Quick Insights</h3>
        <div className="insights-grid">
          <InsightItem icon="📅" label="SIPs Active" value={groww.connected ? '5' : '—'} />
          <InsightItem icon="📊" label="Holdings" value={zerodha.connected ? '8 stocks' : '—'} />
          <InsightItem icon="🎯" label="FD Accounts" value={fd.data ? fd.data.length : '—'} />
          <InsightItem icon="📆" label="PPF Matures" value={ppf.data ? ppf.data.maturity_year : '—'} />
          <InsightItem icon="💡" label="Tax Regime" value="New Regime" />
          <InsightItem icon="🔐" label="Session" value="Secured" color="gain" />
        </div>
      </div>
    </div>
  )
}

function PortfolioCard({ icon, label, subtitle, data, connected, loading, color }) {
  if (loading) {
    return (
      <div className="portfolio-mini-card shimmer">
        <div className="pmc-header"><span>{icon}</span><span>{label}</span></div>
        <p className="pmc-loading">Loading…</p>
      </div>
    )
  }

  if (!connected || !data) {
    return (
      <div className="portfolio-mini-card disconnected">
        <div className="pmc-header"><span>{icon}</span><span>{label}</span></div>
        <p className="pmc-subtitle">{subtitle}</p>
        <p className="pmc-disconnected">Not connected</p>
      </div>
    )
  }

  return (
    <div className="portfolio-mini-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="pmc-header"><span>{icon}</span><span>{label}</span></div>
      <p className="pmc-subtitle">{subtitle}</p>
      <p className="pmc-value">{formatINR(data.current)}</p>
      <p className={`pmc-pnl ${gainLossClass(data.pnl)}`}>
        {formatINR(data.pnl)} ({formatPct(data.pnlPct)})
      </p>
    </div>
  )
}

function InsightItem({ icon, label, value, color }) {
  return (
    <div className="insight-item">
      <span className="insight-icon">{icon}</span>
      <div>
        <p className="insight-label">{label}</p>
        <p className={`insight-value ${color || ''}`}>{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  )
}
