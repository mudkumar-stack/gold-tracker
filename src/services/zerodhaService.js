/**
 * Zerodha Kite Connect Integration
 *
 * PRODUCTION FLOW:
 *   1. Redirect user to: https://kite.zerodha.com/connect/login?api_key=<KEY>&v=3
 *   2. Zerodha redirects back with ?request_token=<TOKEN>
 *   3. Backend exchanges request_token + api_secret → access_token (SHA256 signed)
 *   4. Frontend uses access_token for subsequent API calls via backend proxy
 *
 * API DOCS: https://kite.trade/docs/connect/v3/
 * Rate limits: 3 req/s per user; 10 req/s aggregate
 *
 * DEMO MODE: Returns realistic mock data.
 */

const KITE_BASE = 'https://api.kite.trade' // proxied through your backend in prod

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_HOLDINGS = [
  { tradingsymbol: 'RELIANCE', exchange: 'NSE', isin: 'INE002A01018', quantity: 50, average_price: 2456.80, last_price: 2891.40, pnl: 21730, day_change: 18.50, day_change_percentage: 0.64 },
  { tradingsymbol: 'TCS',      exchange: 'NSE', isin: 'INE467B01029', quantity: 20, average_price: 3218.50, last_price: 4102.30, pnl: 17676, day_change: -24.10, day_change_percentage: -0.58 },
  { tradingsymbol: 'HDFCBANK', exchange: 'NSE', isin: 'INE040A01034', quantity: 100, average_price: 1482.00, last_price: 1724.55, pnl: 24255, day_change: 12.85, day_change_percentage: 0.75 },
  { tradingsymbol: 'INFY',     exchange: 'NSE', isin: 'INE009A01021', quantity: 75, average_price: 1388.20, last_price: 1891.60, pnl: 37755, day_change: -8.40, day_change_percentage: -0.44 },
  { tradingsymbol: 'WIPRO',    exchange: 'NSE', isin: 'INE075A01022', quantity: 200, average_price: 425.30, last_price: 498.70, pnl: 14680, day_change: 3.20, day_change_percentage: 0.64 },
  { tradingsymbol: 'AXISBANK', exchange: 'NSE', isin: 'INE238A01034', quantity: 80,  average_price: 892.00, last_price: 1124.50, pnl: 18600, day_change: 22.30, day_change_percentage: 2.02 },
  { tradingsymbol: 'TATAMOTORS',exchange:'NSE', isin: 'INE155A01022', quantity: 150, average_price: 510.40, last_price: 892.60, pnl: 57330, day_change: -14.20, day_change_percentage: -1.57 },
  { tradingsymbol: 'ITC',       exchange: 'NSE', isin: 'INE154A01025', quantity: 500, average_price: 235.80, last_price: 428.30, pnl: 96250, day_change: 2.80, day_change_percentage: 0.66 },
]

const MOCK_POSITIONS = [
  { tradingsymbol: 'NIFTY26FEB', exchange: 'NFO', product: 'NRML', quantity: 50,  average_price: 22450, last_price: 22891, pnl: 22050, unrealised: 22050, realised: 0 },
  { tradingsymbol: 'BANKNIFTY',  exchange: 'NFO', product: 'MIS',  quantity: -25, average_price: 48200, last_price: 47890, pnl: 7750,  unrealised: 7750,  realised: 0 },
]

const MOCK_ORDERS = [
  { order_id: 'ZRD001', tradingsymbol: 'RELIANCE', transaction_type: 'BUY',  quantity: 10, price: 2880.00, status: 'COMPLETE', order_timestamp: '2026-02-27T09:15:00' },
  { order_id: 'ZRD002', tradingsymbol: 'TCS',      transaction_type: 'SELL', quantity: 5,  price: 4102.30, status: 'COMPLETE', order_timestamp: '2026-02-27T10:32:00' },
  { order_id: 'ZRD003', tradingsymbol: 'INFY',     transaction_type: 'BUY',  quantity: 25, price: 1891.60, status: 'OPEN',     order_timestamp: '2026-02-27T11:00:00' },
]

const MOCK_MARGINS = {
  equity: { available: { cash: 285430.50, collateral: 48000, intraday_payin: 0 }, used: { debits: 21250.00, exposure: 0 } },
  commodity: { available: { cash: 15000, collateral: 0, intraday_payin: 0 }, used: { debits: 0, exposure: 0 } },
}

// ─── Service ─────────────────────────────────────────────────────────────────

let _accessToken = null
let _profile = null

export const ZerodhaService = {
  isConnected() { return _accessToken !== null },

  /** Initiate Kite Connect OAuth — redirect user to Zerodha login */
  initiateLogin(apiKey = import.meta.env.VITE_ZERODHA_API_KEY || 'demo_api_key') {
    // PRODUCTION: redirect to Kite login
    // window.location.href = `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3`
    // DEMO: simulate connection
    return this._demoConnect()
  },

  async _demoConnect() {
    await _delay(800)
    _accessToken = 'demo_access_token_' + Date.now()
    _profile = {
      user_id: 'ZRD2024',
      user_name: 'Demo User',
      email: 'demo@zerodha.com',
      broker: 'ZERODHA',
      user_type: 'individual',
      exchanges: ['NSE', 'BSE', 'NFO', 'MCX'],
      products: ['CNC', 'MIS', 'NRML'],
      order_types: ['MARKET', 'LIMIT', 'SL', 'SL-M'],
    }
    return { success: true, profile: _profile }
  },

  disconnect() {
    _accessToken = null
    _profile = null
  },

  getProfile() { return _profile },

  /** GET /portfolio/holdings — long-term equity holdings */
  async getHoldings() {
    _requireAuth()
    await _delay(400)
    return MOCK_HOLDINGS.map(h => ({
      ...h,
      invested: h.average_price * h.quantity,
      current_value: h.last_price * h.quantity,
      pnl_pct: ((h.last_price - h.average_price) / h.average_price) * 100,
    }))
  },

  /** GET /portfolio/positions — intraday / short-term positions */
  async getPositions() {
    _requireAuth()
    await _delay(300)
    return MOCK_POSITIONS
  },

  /** GET /orders — today's orders */
  async getOrders() {
    _requireAuth()
    await _delay(350)
    return MOCK_ORDERS
  },

  /** GET /user/margins — available & used margins */
  async getMargins() {
    _requireAuth()
    await _delay(250)
    return MOCK_MARGINS
  },

  /** GET /portfolio/holdings summary stats */
  async getPortfolioSummary() {
    const holdings = await this.getHoldings()
    const totalInvested  = holdings.reduce((s, h) => s + h.invested, 0)
    const totalCurrent   = holdings.reduce((s, h) => s + h.current_value, 0)
    const totalPnL       = totalCurrent - totalInvested
    const dayChange      = holdings.reduce((s, h) => s + (h.day_change * h.quantity), 0)
    return { totalInvested, totalCurrent, totalPnL, totalPnLPct: (totalPnL / totalInvested) * 100, dayChange, holdings }
  },
}

function _requireAuth() {
  if (!_accessToken) throw new Error('Not connected to Zerodha. Please connect your account.')
}

function _delay(ms) { return new Promise(r => setTimeout(r, ms)) }
