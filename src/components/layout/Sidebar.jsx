import { usePortfolio } from '../../context/PortfolioContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',       icon: '⬛' },
  { id: 'stocks',     label: 'Stocks',           icon: '📈' },
  { id: 'mutualfunds',label: 'Mutual Funds',     icon: '🏦' },
  { id: 'gold',       label: 'Gold & Silver',    icon: '🪙' },
  { id: 'fd',         label: 'Fixed Deposits',   icon: '🏛️' },
  { id: 'brokers',    label: 'Connect Brokers',  icon: '🔗' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab } = usePortfolio()
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">₹</span>
        <span className="sidebar-brand-name">InvestSecure</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-pan">{user?.pan || '—'}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout} title="Logout">
          ⏻
        </button>
      </div>
    </aside>
  )
}
