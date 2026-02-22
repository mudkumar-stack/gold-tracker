import { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

  // Build chart data: one point per day, averaged, oldest first
  const chartData = useMemo(() => {
    if (history.length === 0) return []

    // Group by date (day level)
    const groups = {}
    const groupOrder = []
    ;[...history].reverse().forEach(entry => {
      const d = new Date(entry.timestamp || entry.date)
      if (isNaN(d.getTime())) return
      const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
      if (!groups[key]) {
        groups[key] = []
        groupOrder.push(key)
      }
      groups[key].push(entry)
    })

    // Average each day and format label based on data span
    const totalDays = groupOrder.length
    return groupOrder.map(key => {
      const entries = groups[key]
      const avg = (arr, field) => arr.reduce((sum, e) => sum + Number(e[field] || 0), 0) / arr.length
      const d = new Date(key)
      // Smart label: show day for short spans, month for longer, year for very long
      let label
      if (totalDays <= 14) {
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (totalDays <= 90) {
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (totalDays <= 365) {
        label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      } else {
        label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }

      if (chartCurrency === 'USD') {
        return { time: label, gold: avg(entries, 'goldUsd'), silver: avg(entries, 'silverUsd') }
      } else {
        return { time: label, gold: avg(entries, 'goldInr'), silver: avg(entries, 'silverInr') }
      }
    })
  }, [history, chartCurrency])

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
            <h2>Price Movement</h2>
            <div className="chart-controls">
              <div className="chart-tabs">
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="time"
                    stroke="#888"
                    tick={{ fontSize: 11, fill: '#888' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="gold"
                    stroke="#ffd700"
                    tick={{ fontSize: 11, fill: '#ffd700' }}
                    tickLine={false}
                    tickFormatter={(v) => chartCurrency === 'USD' ? `$${(v/1000).toFixed(0)}k` : `₹${(v/100000).toFixed(0)}L`}
                    label={{ value: 'Gold', angle: -90, position: 'insideLeft', fill: '#ffd700', fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="silver"
                    orientation="right"
                    stroke="#c0c0c0"
                    tick={{ fontSize: 11, fill: '#c0c0c0' }}
                    tickLine={false}
                    tickFormatter={(v) => chartCurrency === 'USD' ? `$${v.toFixed(0)}` : `₹${(v/1000).toFixed(0)}k`}
                    label={{ value: 'Silver', angle: 90, position: 'insideRight', fill: '#c0c0c0', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8 }}
                    labelStyle={{ color: '#ffd700' }}
                    formatter={(value, name) => [
                      chartCurrency === 'USD' ? `$${Number(value).toFixed(2)}` : `₹${Number(value).toFixed(2)}`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="gold" type="monotone" dataKey="gold" stroke="#ffd700" strokeWidth={2} dot={{ r: 4, fill: '#ffd700' }} activeDot={{ r: 6 }} />
                  <Line yAxisId="silver" type="monotone" dataKey="silver" stroke="#c0c0c0" strokeWidth={2} dot={{ r: 4, fill: '#c0c0c0' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
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
