/**
 * Groww Mutual Fund & Stock Integration
 *
 * INTEGRATION OPTIONS:
 *   1. MF Central API (CAMS/KFintech) — official aggregator
 *   2. BSE StarMF platform — mutual fund transactions
 *   3. RTA direct APIs (CAMS, KFintech, Franklin)
 *   4. Account Aggregator (AA) framework — RBI-regulated open banking
 *
 * For Groww specifically, users can export their portfolio as CAS (Consolidated
 * Account Statement) from MF Central and import it here.
 *
 * DEMO MODE: Returns realistic mock mutual fund + stock data.
 */

const MOCK_MF_HOLDINGS = [
  {
    scheme_name: 'Axis Bluechip Fund — Direct Growth',
    amc: 'Axis AMC', category: 'Equity — Large Cap',
    folio: 'AXS123456', units: 1504.128, nav: 45.2310,
    invested: 50000, current_value: 68047.84,
    sip_amount: 5000, sip_date: 5,
    isin: 'INF846K01EW2', scheme_code: '120503',
    start_date: '2021-03-05',
  },
  {
    scheme_name: 'Mirae Asset Large Cap Fund — Direct Growth',
    amc: 'Mirae Asset AMC', category: 'Equity — Large Cap',
    folio: 'MIR789012', units: 511.342, nav: 82.1450,
    invested: 30000, current_value: 41994.77,
    sip_amount: 3000, sip_date: 10,
    isin: 'INF769K01AW0', scheme_code: '118989',
    start_date: '2021-06-10',
  },
  {
    scheme_name: 'HDFC Mid-Cap Opportunities Fund — Direct Growth',
    amc: 'HDFC AMC', category: 'Equity — Mid Cap',
    folio: 'HDF345678', units: 315.526, nav: 120.4520,
    invested: 25000, current_value: 38003.74,
    sip_amount: 2500, sip_date: 15,
    isin: 'INF179K01VQ7', scheme_code: '119062',
    start_date: '2021-09-15',
  },
  {
    scheme_name: 'Parag Parikh Flexi Cap Fund — Direct Growth',
    amc: 'PPFAS AMC', category: 'Equity — Flexi Cap',
    folio: 'PPF901234', units: 892.344, nav: 68.9200,
    invested: 40000, current_value: 61510.28,
    sip_amount: 4000, sip_date: 1,
    isin: 'INF879O01019', scheme_code: '122639',
    start_date: '2020-12-01',
  },
  {
    scheme_name: 'SBI Liquid Fund — Direct Growth',
    amc: 'SBI Funds', category: 'Debt — Liquid',
    folio: 'SBI567890', units: 108.234, nav: 3801.4500,
    invested: 400000, current_value: 411490.62,
    sip_amount: 0, sip_date: null,
    isin: 'INF200K01RB2', scheme_code: '103504',
    start_date: '2025-01-15',
  },
  {
    scheme_name: 'Nippon India Small Cap Fund — Direct Growth',
    amc: 'Nippon India AMC', category: 'Equity — Small Cap',
    folio: 'NIP234567', units: 2205.882, nav: 135.2300,
    invested: 150000, current_value: 298241.89,
    sip_amount: 10000, sip_date: 20,
    isin: 'INF204K01B33', scheme_code: '125494',
    start_date: '2019-08-20',
  },
]

const MOCK_SIP_UPCOMING = [
  { scheme_name: 'Axis Bluechip Fund', amount: 5000, next_date: '2026-03-05', bank: 'HDFC Bank **5678' },
  { scheme_name: 'Mirae Asset Large Cap', amount: 3000, next_date: '2026-03-10', bank: 'HDFC Bank **5678' },
  { scheme_name: 'Nippon India Small Cap', amount: 10000, next_date: '2026-03-20', bank: 'SBI **1234' },
  { scheme_name: 'HDFC Mid-Cap', amount: 2500, next_date: '2026-03-15', bank: 'ICICI Bank **9012' },
  { scheme_name: 'Parag Parikh Flexi Cap', amount: 4000, next_date: '2026-03-01', bank: 'HDFC Bank **5678' },
]

const MOCK_MF_TRANSACTIONS = [
  { date: '2026-02-05', scheme: 'Axis Bluechip Fund', type: 'SIP Purchase', amount: 5000, units: 110.6, nav: 45.2310, status: 'Processed' },
  { date: '2026-02-10', scheme: 'Mirae Asset Large Cap', type: 'SIP Purchase', amount: 3000, units: 36.5, nav: 82.1450, status: 'Processed' },
  { date: '2026-02-20', scheme: 'Nippon Small Cap', type: 'SIP Purchase', amount: 10000, units: 74.0, nav: 135.2300, status: 'Processed' },
  { date: '2026-01-15', scheme: 'SBI Liquid Fund', type: 'Lumpsum Purchase', amount: 100000, units: 26.3, nav: 3801.45, status: 'Processed' },
  { date: '2026-01-01', scheme: 'Parag Parikh Flexi Cap', type: 'SIP Purchase', amount: 4000, units: 58.0, nav: 68.92, status: 'Processed' },
]

// Groww Stocks portfolio (separate from Zerodha)
const MOCK_GROWW_STOCKS = [
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', qty: 10, avg: 6820.00, ltp: 7241.80, exchange: 'NSE' },
  { symbol: 'PIDILITIND',  name: 'Pidilite Industries', qty: 25, avg: 2380.50, ltp: 2891.30, exchange: 'NSE' },
  { symbol: 'DMART',       name: 'Avenue Supermarts', qty: 8,  avg: 3812.00, ltp: 4320.50, exchange: 'NSE' },
]

// ─── Service ─────────────────────────────────────────────────────────────────

let _connected = false

export const GrowwService = {
  isConnected() { return _connected },

  async connect() {
    // PRODUCTION: OAuth2 redirect to Groww or MF Central API auth
    await _delay(600)
    _connected = true
    return { success: true }
  },

  disconnect() { _connected = false },

  async getMFHoldings() {
    _requireAuth()
    await _delay(500)
    return MOCK_MF_HOLDINGS.map(mf => ({
      ...mf,
      pnl: mf.current_value - mf.invested,
      pnl_pct: ((mf.current_value - mf.invested) / mf.invested) * 100,
    }))
  },

  async getStockHoldings() {
    _requireAuth()
    await _delay(300)
    return MOCK_GROWW_STOCKS.map(s => ({
      ...s,
      invested: s.avg * s.qty,
      current_value: s.ltp * s.qty,
      pnl: (s.ltp - s.avg) * s.qty,
      pnl_pct: ((s.ltp - s.avg) / s.avg) * 100,
    }))
  },

  async getUpcomingSIPs() {
    _requireAuth()
    await _delay(200)
    return MOCK_SIP_UPCOMING
  },

  async getTransactions() {
    _requireAuth()
    await _delay(300)
    return MOCK_MF_TRANSACTIONS
  },

  async getPortfolioSummary() {
    const [mf, stocks] = await Promise.all([this.getMFHoldings(), this.getStockHoldings()])
    const mfInvested    = mf.reduce((s, m) => s + m.invested, 0)
    const mfCurrent     = mf.reduce((s, m) => s + m.current_value, 0)
    const stInvested    = stocks.reduce((s, st) => s + st.invested, 0)
    const stCurrent     = stocks.reduce((s, st) => s + st.current_value, 0)
    const totalInvested = mfInvested + stInvested
    const totalCurrent  = mfCurrent + stCurrent
    return {
      totalInvested, totalCurrent,
      totalPnL: totalCurrent - totalInvested,
      totalPnLPct: ((totalCurrent - totalInvested) / totalInvested) * 100,
      mfInvested, mfCurrent, stInvested, stCurrent,
      mfHoldings: mf, stockHoldings: stocks,
    }
  },
}

function _requireAuth() {
  if (!_connected) throw new Error('Not connected to Groww. Please connect your account.')
}

function _delay(ms) { return new Promise(r => setTimeout(r, ms)) }


// ─── Additional Institutions ──────────────────────────────────────────────────

/** Fixed Deposit tracker (manual / AA framework) */
export const FDService = {
  getFDs() {
    return [
      { bank: 'SBI', principal: 200000, rate: 7.10, tenure_months: 24, maturity_date: '2027-02-15', maturity_amount: 232384, auto_renew: true },
      { bank: 'HDFC Bank', principal: 500000, rate: 7.25, tenure_months: 36, maturity_date: '2028-08-20', maturity_amount: 621045, auto_renew: false },
      { bank: 'ICICI Bank', principal: 100000, rate: 7.00, tenure_months: 12, maturity_date: '2026-11-10', maturity_amount: 107000, auto_renew: true },
    ]
  },
}

/** PPF tracker (manual entry) */
export const PPFService = {
  getSummary() {
    return {
      account_number: 'SBI/PPF/1234567',
      balance: 850000,
      invested_this_year: 150000,
      max_limit: 150000,
      interest_rate: 7.10,
      maturity_year: 2031,
      tax_status: 'EEE', // Exempt-Exempt-Exempt
    }
  },
}
