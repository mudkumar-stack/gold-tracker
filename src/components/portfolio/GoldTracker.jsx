import { useState, useEffect, useCallback, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatINR } from '../../utils/formatters.js'

const API_KEY = 'goldapi-w3hkrsmlxjm02i-io'
const USD_TO_INR = 83.5
const OZ_PER_KG = 32.1507
const REFRESH_MS = 5 * 60 * 1000

export default function GoldTracker() {
  const [goldPrice, setGoldPrice] = useState(null)
  const [silverPrice, setSilverPrice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('metalPriceHistory') || '[]') } catch { return [] }
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastFetch, setLastFetch] = useState(null)
  const [chartMetal, setChartMetal] = useState('gold')
  const [chartCurrency, setChartCurrency] = useState('INR')
  const [chartPeriod, setChartPeriod] = useState('1D')
  const [alerts, setAlerts] = useState([])

  // Physical holding tracker
  const [goldGrams, setGoldGrams] = useState(() => Number(localStorage.getItem('goldGrams') || 0))
  const [silverGrams, setSilverGrams] = useState(() => Number(localStorage.getItem('silverGrams') || 0))
  const [editHolding, setEditHolding] = useState(false)

  const fetchMetal = async (symbol) => {
    const res = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
      headers: { 'x-access-token': API_KEY },
    })
    if (!res.ok) throw new Error(`Failed to fetch ${symbol}`)
    return (await res.json()).price
  }

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [goldOz, silverOz] = await Promise.all([fetchMetal('XAU'), fetchMetal('XAG')])
      const goldKg = goldOz * OZ_PER_KG
      const silverKg = silverOz * OZ_PER_KG
      setGoldPrice(goldKg)
      setSilverPrice(silverKg)
      setLastFetch(new Date())

      const newAlerts = []
      if (history.length > 0) {
        const last = history[0]
        if (last.goldUsd) {
          const chg = ((goldKg - last.goldUsd) / last.goldUsd) * 100
          if (Math.abs(chg) > 1) newAlerts.push({ metal: 'Gold', pct: chg })
        }
      }
      if (newAlerts.length) setAlerts(newAlerts)

      const entry = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString(),
        goldUsd: goldKg, goldInr: (goldKg * USD_TO_INR).toFixed(2),
        silverUsd: silverKg, silverInr: (silverKg * USD_TO_INR).toFixed(2),
      }
      setHistory(prev => {
        const updated = [entry, ...prev].slice(0, 1000)
        localStorage.setItem('metalPriceHistory', JSON.stringify(updated))
        return updated
      })
    } catch { setError('Unable to fetch prices. Check connection or API key.') }
    finally { setLoading(false) }
  }, [history])

  useEffect(() => { fetchPrices() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchPrices, REFRESH_MS)
    return () => clearInterval(id)
  }, [autoRefresh, fetchPrices])

  function saveHoldings() {
    localStorage.setItem('goldGrams', goldGrams)
    localStorage.setItem('silverGrams', silverGrams)
    setEditHolding(false)
  }

  const goldValueINR = goldPrice ? (goldPrice * USD_TO_INR) / 1000 * goldGrams : 0
  const silverValueINR = silverPrice ? (silverPrice * USD_TO_INR) / 1000 * silverGrams : 0

  const chartData = useMemo(() => {
    if (!history.length) return []
    const now = Date.now()
    const cutoffs = { '1D': 86400e3, '1W': 7*86400e3, '1M': 30*86400e3, '3M': 90*86400e3 }
    const cutoff = now - (cutoffs[chartPeriod] || Infinity)
    const field = `${chartMetal}${chartCurrency}`
    return [...history].reverse()
      .filter(e => e.timestamp && new Date(e.timestamp).getTime() >= cutoff)
      .map(e => {
        const d = new Date(e.timestamp)
        const label = chartPeriod === '1D'
          ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        return { time: label, value: Number(e[field]) }
      })
  }, [history, chartMetal, chartCurrency, chartPeriod])

  return (
    <div className="gold-page">
      {alerts.map((a, i) => (
        <div key={i} className={`alert-banner ${a.pct > 0 ? 'gain' : 'loss'}`}>
          {a.metal} {a.pct > 0 ? '↑' : '↓'} {Math.abs(a.pct).toFixed(2)}% since last fetch
          <button onClick={() => setAlerts(p => p.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}

      {/* Live Prices */}
      <div className="metal-price-grid">
        <PriceCard metal="gold" label="Gold (XAU)" priceUSD={goldPrice} priceINR={goldPrice ? goldPrice * USD_TO_INR : null} loading={loading} error={error} />
        <PriceCard metal="silver" label="Silver (XAG)" priceUSD={silverPrice} priceINR={silverPrice ? silverPrice * USD_TO_INR : null} loading={loading} error={error} />
      </div>

      <div className="refresh-row">
        <button className="refresh-btn" onClick={fetchPrices} disabled={loading}>
          {loading ? '⏳ Refreshing…' : '🔄 Refresh'}
        </button>
        <label className="toggle-label">
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          Auto-refresh (5 min)
        </label>
        {lastFetch && <span className="last-updated">Updated {lastFetch.toLocaleTimeString()}</span>}
      </div>

      {/* Physical Holdings */}
      <div className="card physical-holdings">
        <div className="card-header-row">
          <h3 className="card-title">My Physical Holdings</h3>
          <button className="edit-btn" onClick={() => setEditHolding(!editHolding)}>
            {editHolding ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>
        {editHolding ? (
          <div className="holdings-edit">
            <div className="holding-input-group">
              <label>Gold (grams)</label>
              <input type="number" min="0" value={goldGrams} onChange={e => setGoldGrams(Number(e.target.value))} className="form-input" />
            </div>
            <div className="holding-input-group">
              <label>Silver (grams)</label>
              <input type="number" min="0" value={silverGrams} onChange={e => setSilverGrams(Number(e.target.value))} className="form-input" />
            </div>
            <button className="auth-btn primary small" onClick={saveHoldings}>Save</button>
          </div>
        ) : (
          <div className="holdings-display">
            <HoldingRow metal="Gold" grams={goldGrams} valueINR={goldValueINR} />
            <HoldingRow metal="Silver" grams={silverGrams} valueINR={silverValueINR} />
            <div className="holding-total">
              <span>Total Value</span>
              <strong>{formatINR(goldValueINR + silverValueINR)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {history.length >= 2 && (
        <div className="card chart-section">
          <div className="chart-controls">
            <div className="view-tabs">
              {['gold','silver'].map(m => (
                <button key={m} className={`view-tab ${chartMetal === m ? 'active' : ''}`} onClick={() => setChartMetal(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <div className="view-tabs">
              {['USD','INR'].map(c => (
                <button key={c} className={`view-tab ${chartCurrency === c ? 'active' : ''}`} onClick={() => setChartCurrency(c)}>{c}</button>
              ))}
            </div>
            <div className="view-tabs">
              {['1D','1W','1M','3M'].map(p => (
                <button key={p} className={`view-tab ${chartPeriod === p ? 'active' : ''}`} onClick={() => setChartPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartMetal === 'gold' ? '#ffd700' : '#a0a0c0'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartMetal === 'gold' ? '#ffd700' : '#a0a0c0'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} width={60}
                tickFormatter={v => chartCurrency === 'INR' ? `₹${v >= 1e5 ? (v/1e5).toFixed(1)+'L' : v >= 1000 ? (v/1000).toFixed(0)+'k' : v}` : `$${(v/1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: '#1c2033', border: '1px solid #2a2e45', borderRadius: 8, fontSize: 12 }}
                formatter={v => [chartCurrency === 'INR' ? formatINR(v) : `$${v.toLocaleString()}`, chartMetal === 'gold' ? 'Gold/kg' : 'Silver/kg']}
              />
              <Area type="monotone" dataKey="value" stroke={chartMetal === 'gold' ? '#ffd700' : '#8888cc'} strokeWidth={2} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title">Price History</h3>
            <button className="edit-btn" onClick={() => { setHistory([]); localStorage.removeItem('metalPriceHistory') }}>
              🗑️ Clear
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Date & Time</th><th>Gold USD/kg</th><th>Gold INR/kg</th><th>Silver USD/kg</th><th>Silver INR/kg</th></tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td>{e.date}</td>
                    <td>${Number(e.goldUsd).toFixed(2)}</td>
                    <td>₹{e.goldInr}</td>
                    <td>${Number(e.silverUsd).toFixed(2)}</td>
                    <td>₹{e.silverInr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PriceCard({ metal, label, priceUSD, priceINR, loading, error }) {
  const colorClass = metal === 'gold' ? 'gold' : 'silver'
  return (
    <div className={`price-card ${colorClass} ${loading ? 'shimmer' : ''}`}>
      <h3>{label}</h3>
      <div className="price-pair">
        <div>
          <p className="price-unit">USD / kg</p>
          <p className="price-val">{loading ? '…' : error ? '—' : `$${priceUSD?.toLocaleString('en-US', {minimumFractionDigits:2})}`}</p>
        </div>
        <div>
          <p className="price-unit">INR / kg</p>
          <p className="price-val">{loading ? '…' : error ? '—' : `₹${(priceINR/1000).toFixed(2)}K`}</p>
        </div>
      </div>
    </div>
  )
}

function HoldingRow({ metal, grams, valueINR }) {
  return (
    <div className="holding-row">
      <span className="holding-metal">{metal}</span>
      <span className="holding-grams">{grams}g</span>
      <span className="holding-value">{formatINR(valueINR)}</span>
    </div>
  )
}
