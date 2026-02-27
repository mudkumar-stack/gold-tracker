import { useAuth, AuthProvider } from './context/AuthContext.jsx'
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext.jsx'
import AadharLogin from './components/auth/AadharLogin.jsx'
import OTPVerification from './components/auth/OTPVerification.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import Header from './components/layout/Header.jsx'
import Dashboard from './components/dashboard/Dashboard.jsx'
import StockHoldings from './components/portfolio/StockHoldings.jsx'
import MutualFunds from './components/portfolio/MutualFunds.jsx'
import GoldTracker from './components/portfolio/GoldTracker.jsx'
import FixedDeposits from './components/portfolio/FixedDeposits.jsx'
import BrokerConnect from './components/brokers/BrokerConnect.jsx'
import './App.css'

function AuthScreen() {
  const { phase } = useAuth()
  return (
    <div className="auth-screen">
      <div className="auth-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>
      {phase === 'otp_sent' || phase === 'verifying' ? <OTPVerification /> : <AadharLogin />}
    </div>
  )
}

function MainApp() {
  const { activeTab } = usePortfolio()

  const views = {
    dashboard:   <Dashboard />,
    stocks:      <StockHoldings />,
    mutualfunds: <MutualFunds />,
    gold:        <GoldTracker />,
    fd:          <FixedDeposits />,
    brokers:     <BrokerConnect />,
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="main-view">
          {views[activeTab] || <Dashboard />}
        </main>
      </div>
    </div>
  )
}

function AppInner() {
  const { phase } = useAuth()
  const isAuthenticated = phase === 'authenticated'
  return isAuthenticated ? <MainApp /> : <AuthScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <AppInner />
      </PortfolioProvider>
    </AuthProvider>
  )
}
