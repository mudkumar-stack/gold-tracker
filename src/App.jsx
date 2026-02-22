import { useState, useEffect, useCallback } from 'react'
import './App.css'

// ⬇️ Your GoldAPI key
const API_KEY = 'goldapi-w3hkrsmlxjm02i-io'

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
        date: new Date().toLocaleString(),
        goldUsd: goldKg,
        goldInr: (goldKg * USD_TO_INR).toFixed(2),
        silverUsd: silverKg,
        silverInr: (silverKg * USD_TO_INR).toFixed(2)
      }
      setHistory(prev => {
        const updated = [entry, ...prev].slice(0, 10)
        localStorage.setItem('metalPriceHistory', JSON.stringify(updated))
        return updated
      })
    } catch (err) {
      setError('Unable to fetch prices. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [history])

  useEffect(() => {
    fetchPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('metalPriceHistory')
  }

  const dismissAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index))
  }

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
          <p className="last-updated">Last updated: {new Date().toLocaleTimeString()}</p>
        )}

        <button
          className="refresh-btn"
          onClick={fetchPrices}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Prices'}
        </button>

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
