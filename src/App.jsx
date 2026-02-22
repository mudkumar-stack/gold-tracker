import { useState, useEffect, useCallback, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

// ⬇️ Your GoldAPI key
const API_KEY = 'goldapi-w3hkrsmlxjm02i-io'
const AUTO_REFRESH_MS = 5 * 60 * 1000 // Auto-refresh every 5 minutes

function App() {
  const [goldPrice, setGoldPrice] = useState(null)
  const [silverPrice, setSilverPrice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('metalPriceHistory')
    return saved ? JSON.parse(saved) : []
  })
  const [alerts, setAlerts] = useState([])
  const [chartCurrency, setChartCurrency] = useState('USD')
  const [chartMetal, setChartMetal] = useState('gold')
  const [chartPeriod, setChartPeriod] = useState('1D')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState(null)

  const USD_TO_INR = 83.5
  const OZ_PER_KG = 32.1507 // 1 kg = 32.1507 troy ounces

  const fetchMetal = async (symbol) => {
    const res = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
      headers: { 'x-access-token': API_KEY }
    })
    if (!res.ok) throw new Error(`Failed to fetch ${symbol} price`)
    const data = await res.json()
    return data.price
  }

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [gold, silver] = await Promise.all([
        fetchMetal('XAU'),
        fetchMetal('XAG')
      ])

      setGoldPrice(gold * OZ_PER_KG)
      setSilverPrice(silver * OZ_PER_KG)
      setLastFetchTime(new Date())

      // Check for price change alerts
      const newAlerts = []
      if (history.length > 0) {
        const last = history[0]
        if (last.goldUsd) {
          const goldChange = ((gold - last.goldUsd) / last.goldUsd) * 100
          if (Math.abs(goldChange) > 1) {
            newAlerts.push({
              metal: 'Gold',
              percent: goldChange.toFixed(2),
              direction: goldChange > 0 ? 'up' : 'down'
            })
          }
        }
        if (last.silverUsd) {
          const silverChange = ((silver - last.silverUsd) / last.silverUsd) * 100
          if (Math.abs(silverChange) > 1) {
            newAlerts.push({
              metal: 'Silver',
              percent: silverChange.toFixed(2),
              direction: silverChange > 0 ? 'up' : 'down'
            })
          }
        }
      }
      if (newAlerts.length > 0) setAlerts(newAlerts)

      // Convert from per-oz to per-kg and add to history
      const goldKg = gold * OZ_PER_KG
      const silverKg = silver * OZ_PER_KG
      const entry = {
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString(),
        goldUsd: goldKg,
        goldInr: (goldKg * USD_TO_INR).toFixed(2),
        silverUsd: silverKg,
        silverInr: (silverKg * USD_TO_INR).toFixed(2)
      }
      setHistory(prev => {
        const updated = [entry, ...prev].slice(0, 1000)
        localStorage.setItem('metalPriceHistory', JSON.stringify(updated))
        return updated
      })
    } catch (err) {
      setError('Unable to fetch prices. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [history])

  // Initial fetch
  useEffect(() => {
    fetchPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchPrices()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchPrices])

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('metalPriceHistory')
  }

  const dismissAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index))
  }

  // Build chart data filtered by period, one point per fetch, oldest first
  const chartData = useMemo(() => {
    if (history.length === 0) return []

    const now = new Date()
    let cutoff
    switch (chartPeriod) {
      case '1D': cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); break
      case '1W': cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
      case '1M': cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
      case '3M': cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break
      default: cutoff = new Date(0)
    }

    const field = chartMetal === 'gold'
      ? (chartCurrency === 'USD' ? 'goldUsd' : 'goldInr')
      : (chartCurrency === 'USD' ? 'silverUsd' : 'silverInr')

    return [...history]
      .reverse()
      .filter(entry => {
        const ts = entry.timestamp
        if (!ts) return false
        const d = new Date(ts)
        return !isNaN(d.getTime()) && d >= cutoff
      })
      .map(entry => {
        const d = new Date(entry.timestamp)
        let label
        if (chartPeriod === '1D') {
          label = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        } else if (chartPeriod === '1W') {
          label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
        } else if (chartPeriod === '1M') {
          label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        } else {
          label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        }
        return { time: label, value: Number(entry[field]) }
      })
  }, [history, chartCurrency, chartMetal, chartPeriod])

  return (
    <div className="app">
      {/* Alert Banners */}
      {alerts.map((a, i) => (
        <div key={i} className={`alert-banner ${a.direction}`}>
          <span>
            {a.metal} price moved {a.direction === 'up' ? '↑' : '↓'} {Math.abs(a.percent)}% since last check!
          </span>
          <button className="alert-close" onClick={() => dismissAlert(i)}>✕</button>
        </div>
      ))}

      <header className="header">
        <h1>🪙 Gold & Silver Tracker</h1>
      </header>

      <main className="main">
        {/* Gold Cards */}
        <h3 className="section-label">Gold (XAU)</h3>
        <div className="cards">
          <div className={`card gold ${loading ? 'shimmer' : ''}`}>
            <h2>USD / kg</h2>
            {loading ? (
              <p className="price loading-text">Fetching...</p>
            ) : error ? (
              <p className="price error-text">{error}</p>
            ) : (
              <p className="price">${goldPrice ? goldPrice.toFixed(2) : '—'}</p>
            )}
          </div>
          <div className={`card gold ${loading ? 'shimmer' : ''}`}>
            <h2>INR / kg</h2>
            {loading ? (
              <p className="price loading-text">Fetching...</p>
            ) : error ? (
              <p className="price error-text">{error}</p>
            ) : (
              <p className="price">₹{goldPrice ? (goldPrice * USD_TO_INR).toFixed(2) : '—'}</p>
            )}
          </div>
        </div>

        {/* Silver Cards */}
        <h3 className="section-label silver-label">Silver (XAG)</h3>
        <div className="cards">
          <div className={`card silver ${loading ? 'shimmer' : ''}`}>
            <h2>USD / kg</h2>
            {loading ? (
              <p className="price loading-text">Fetching...</p>
            ) : error ? (
              <p className="price error-text">{error}</p>
            ) : (
              <p className="price">${silverPrice ? silverPrice.toFixed(2) : '—'}</p>
            )}
          </div>
          <div className={`card silver ${loading ? 'shimmer' : ''}`}>
            <h2>INR / kg</h2>
            {loading ? (
              <p className="price loading-text">Fetching...</p>
            ) : error ? (
              <p className="price error-text">{error}</p>
            ) : (
              <p className="price">₹{silverPrice ? (silverPrice * USD_TO_INR).toFixed(2) : '—'}</p>
            )}
          </div>
        </div>

        {goldPrice && !loading && (
          <p className="last-updated">
            Last updated: {lastFetchTime ? lastFetchTime.toLocaleTimeString() : '—'}
            {autoRefresh && ' • Auto-refreshes every 5 min'}
          </p>
        )}

        <div className="refresh-row">
          <button
            className="refresh-btn"
            onClick={fetchPrices}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Prices'}
          </button>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
        </div>

        {/* Price Movement Chart */}
        {history.length >= 2 && (
          <section className="chart-section">
            <div className="chart-header">
              <div className="chart-metal-tabs">
                <button
                  className={`chart-metal-tab ${chartMetal === 'gold' ? 'active gold' : ''}`}
                  onClick={() => setChartMetal('gold')}
                >Gold</button>
                <button
                  className={`chart-metal-tab ${chartMetal === 'silver' ? 'active silver' : ''}`}
                  onClick={() => setChartMetal('silver')}
                >Silver</button>
              </div>
              <div className="chart-currency-tabs">
                <button
                  className={`chart-tab ${chartCurrency === 'USD' ? 'active' : ''}`}
                  onClick={() => setChartCurrency('USD')}
                >USD</button>
                <button
                  className={`chart-tab ${chartCurrency === 'INR' ? 'active' : ''}`}
                  onClick={() => setChartCurrency('INR')}
                >INR</button>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffd700" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ffd700" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradientSilver" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a0a0c0" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#a0a0c0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={true} />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#666' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#666' }}
                    tickFormatter={(v) => chartCurrency === 'USD' ? `$${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toFixed(0)}` : `₹${v >= 100000 ? (v/100000).toFixed(1) + 'L' : v >= 1000 ? (v/1000).toFixed(0) + 'k' : v.toFixed(0)}`}
                    domain={['auto', 'auto']}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ background: 'rgba(26,26,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }}
                    labelStyle={{ color: '#999', fontSize: 11 }}
                    formatter={(value) => [
                      chartCurrency === 'USD' ? `$${Number(value).toLocaleString('en-US', {minimumFractionDigits: 2})}` : `₹${Number(value).toLocaleString('en-IN', {minimumFractionDigits: 2})}`,
                      chartMetal === 'gold' ? 'Gold' : 'Silver'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartMetal === 'gold' ? '#ffd700' : '#8888cc'}
                    strokeWidth={2}
                    fill={chartMetal === 'gold' ? 'url(#gradientGold)' : 'url(#gradientSilver)'}
                    dot={false}
                    activeDot={{ r: 4, stroke: chartMetal === 'gold' ? '#ffd700' : '#8888cc', strokeWidth: 2, fill: '#1a1a2e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-period-bar">
              <span className="chart-period-label">{chartMetal === 'gold' ? 'MCX Gold' : 'MCX Silver'}</span>
              <div className="chart-period-tabs">
                {['1D', '1W', '1M', '3M'].map(p => (
                  <button
                    key={p}
                    className={`period-tab ${chartPeriod === p ? 'active' : ''}`}
                    onClick={() => setChartPeriod(p)}
                  >{p}</button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="history">
          <h2>Price History</h2>
          {history.length === 0 ? (
            <p className="no-history">No history yet. Fetch prices to get started.</p>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Gold USD/kg</th>
                      <th>Gold INR/kg</th>
                      <th>Silver USD/kg</th>
                      <th>Silver INR/kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, i) => (
                      <tr key={i}>
                        <td>{entry.date}</td>
                        <td>${Number(entry.goldUsd).toFixed(2)}</td>
                        <td>₹{entry.goldInr}</td>
                        <td>${Number(entry.silverUsd).toFixed(2)}</td>
                        <td>₹{entry.silverInr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="clear-btn" onClick={clearHistory}>
                🗑️ Clear History
              </button>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Prices are indicative. Not financial advice.</p>
      </footer>
    </div>
  )
}

export default App
