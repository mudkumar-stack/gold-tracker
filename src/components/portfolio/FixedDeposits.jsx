import { useEffect } from 'react'
import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { formatINRFull, formatDate, gainLossClass } from '../../utils/formatters.js'

export default function FixedDeposits() {
  const { fd, ppf, loadFDPPF } = usePortfolio()

  useEffect(() => { loadFDPPF() }, [loadFDPPF])

  const fds = fd.data || []
  const ppfData = ppf.data

  const totalPrincipal = fds.reduce((s, f) => s + f.principal, 0)
  const totalMaturity  = fds.reduce((s, f) => s + f.maturity_amount, 0)

  return (
    <div className="fd-page">
      {/* FD Section */}
      <div className="card">
        <h3 className="card-title">Fixed Deposits</h3>
        <div className="fd-summary">
          <span>Principal: <strong>{formatINRFull(totalPrincipal)}</strong></span>
          <span>Maturity: <strong>{formatINRFull(totalMaturity)}</strong></span>
          <span className="gain">Interest: <strong>{formatINRFull(totalMaturity - totalPrincipal)}</strong></span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Bank</th><th>Principal</th><th>Rate</th><th>Tenure</th><th>Maturity Date</th><th>Maturity Amount</th><th>Auto-Renew</th></tr>
            </thead>
            <tbody>
              {fds.map((fd, i) => (
                <tr key={i}>
                  <td><strong>{fd.bank}</strong></td>
                  <td>{formatINRFull(fd.principal)}</td>
                  <td className="gain">{fd.rate}% p.a.</td>
                  <td>{fd.tenure_months} months</td>
                  <td>{formatDate(fd.maturity_date)}</td>
                  <td className="gain">{formatINRFull(fd.maturity_amount)}</td>
                  <td>{fd.auto_renew ? '✓ Yes' : '✗ No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PPF Section */}
      {ppfData && (
        <div className="card">
          <h3 className="card-title">Public Provident Fund (PPF)</h3>
          <div className="ppf-grid">
            <PPFItem label="Account" value={ppfData.account_number} />
            <PPFItem label="Balance" value={formatINRFull(ppfData.balance)} />
            <PPFItem label="Invested This Year" value={formatINRFull(ppfData.invested_this_year)} />
            <PPFItem label="Annual Limit" value={formatINRFull(ppfData.max_limit)} />
            <PPFItem label="Remaining Limit" value={formatINRFull(ppfData.max_limit - ppfData.invested_this_year)} color="gain" />
            <PPFItem label="Interest Rate" value={`${ppfData.interest_rate}% p.a.`} color="gain" />
            <PPFItem label="Matures In" value={ppfData.maturity_year} />
            <PPFItem label="Tax Status" value={ppfData.tax_status} color="gain" />
          </div>
          <div className="ppf-note">
            <span>💡</span>
            <span>PPF offers EEE (Exempt-Exempt-Exempt) tax benefits. Contributions up to ₹1.5L deductible under Sec 80C.</span>
          </div>
        </div>
      )}
    </div>
  )
}

function PPFItem({ label, value, color }) {
  return (
    <div className="ppf-item">
      <span className="ppf-label">{label}</span>
      <span className={`ppf-value ${color || ''}`}>{value}</span>
    </div>
  )
}
