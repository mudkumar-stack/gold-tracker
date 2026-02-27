/** Currency & number formatting utilities for Indian financial context */

/** Format INR with ₹ symbol and Indian numbering (lakhs/crores) */
export function formatINR(amount, decimals = 2) {
  if (amount == null || isNaN(amount)) return '—'
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

/** Full INR format with commas (no abbreviation) */
export function formatINRFull(amount) {
  if (amount == null || isNaN(amount)) return '—'
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Format percentage with color class hint */
export function formatPct(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(decimals)}%`
}

/** Return CSS class based on positive/negative value */
export function gainLossClass(value) {
  if (value > 0) return 'gain'
  if (value < 0) return 'loss'
  return 'neutral'
}

/** Format large numbers with Indian suffix */
export function formatNumber(n) {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(2)}L`
  return n.toLocaleString('en-IN')
}

/** Format date to DD MMM YYYY */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Relative time (e.g. "2 min ago") */
export function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/** Calculate XIRR-approximate annualised return (simplified) */
export function calcCAGR(invested, current, years) {
  if (!invested || !years) return 0
  return (Math.pow(current / invested, 1 / years) - 1) * 100
}

/** Calculate absolute gain/loss percentage */
export function calcPct(invested, current) {
  if (!invested) return 0
  return ((current - invested) / invested) * 100
}
