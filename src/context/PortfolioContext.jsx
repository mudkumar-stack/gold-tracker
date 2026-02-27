import { createContext, useContext, useReducer, useCallback } from 'react'
import { ZerodhaService } from '../services/zerodhaService.js'
import { GrowwService, FDService, PPFService } from '../services/growwService.js'

const PortfolioContext = createContext(null)

const initialState = {
  zerodha: { connected: false, loading: false, error: null, data: null },
  groww:   { connected: false, loading: false, error: null, data: null },
  gold:    { loading: false, error: null, data: null },
  fd:      { data: null },
  ppf:     { data: null },
  activeTab: 'dashboard',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TAB': return { ...state, activeTab: action.tab }

    case 'ZERODHA_CONNECT_START': return { ...state, zerodha: { ...state.zerodha, loading: true, error: null } }
    case 'ZERODHA_CONNECTED':     return { ...state, zerodha: { connected: true, loading: false, error: null, data: action.data } }
    case 'ZERODHA_ERROR':         return { ...state, zerodha: { ...state.zerodha, loading: false, error: action.error } }
    case 'ZERODHA_DISCONNECT':    return { ...state, zerodha: { ...initialState.zerodha } }

    case 'GROWW_CONNECT_START':   return { ...state, groww: { ...state.groww, loading: true, error: null } }
    case 'GROWW_CONNECTED':       return { ...state, groww: { connected: true, loading: false, error: null, data: action.data } }
    case 'GROWW_ERROR':           return { ...state, groww: { ...state.groww, loading: false, error: action.error } }
    case 'GROWW_DISCONNECT':      return { ...state, groww: { ...initialState.groww } }

    case 'LOAD_FD_PPF':           return { ...state, fd: { data: action.fd }, ppf: { data: action.ppf } }

    default: return state
  }
}

export function PortfolioProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const connectZerodha = useCallback(async () => {
    dispatch({ type: 'ZERODHA_CONNECT_START' })
    try {
      await ZerodhaService.initiateLogin()
      const data = await ZerodhaService.getPortfolioSummary()
      dispatch({ type: 'ZERODHA_CONNECTED', data })
    } catch (err) {
      dispatch({ type: 'ZERODHA_ERROR', error: err.message })
    }
  }, [])

  const disconnectZerodha = useCallback(() => {
    ZerodhaService.disconnect()
    dispatch({ type: 'ZERODHA_DISCONNECT' })
  }, [])

  const connectGroww = useCallback(async () => {
    dispatch({ type: 'GROWW_CONNECT_START' })
    try {
      await GrowwService.connect()
      const data = await GrowwService.getPortfolioSummary()
      dispatch({ type: 'GROWW_CONNECTED', data })
    } catch (err) {
      dispatch({ type: 'GROWW_ERROR', error: err.message })
    }
  }, [])

  const disconnectGroww = useCallback(() => {
    GrowwService.disconnect()
    dispatch({ type: 'GROWW_DISCONNECT' })
  }, [])

  const loadFDPPF = useCallback(() => {
    dispatch({
      type: 'LOAD_FD_PPF',
      fd: FDService.getFDs(),
      ppf: PPFService.getSummary(),
    })
  }, [])

  const setActiveTab = useCallback((tab) => dispatch({ type: 'SET_TAB', tab }), [])

  // Compute aggregate totals
  const totals = {
    zerodha: state.zerodha.data ? {
      invested: state.zerodha.data.totalInvested,
      current:  state.zerodha.data.totalCurrent,
      pnl:      state.zerodha.data.totalPnL,
      pnlPct:   state.zerodha.data.totalPnLPct,
    } : null,
    groww: state.groww.data ? {
      invested: state.groww.data.totalInvested,
      current:  state.groww.data.totalCurrent,
      pnl:      state.groww.data.totalPnL,
      pnlPct:   state.groww.data.totalPnLPct,
    } : null,
    fd: state.fd.data ? state.fd.data.reduce((s, fd) => ({
      invested: s.invested + fd.principal,
      current:  s.current  + fd.maturity_amount,
    }), { invested: 0, current: 0 }) : null,
    ppf: state.ppf.data ? {
      invested: state.ppf.data.balance,
      current:  Math.round(state.ppf.data.balance * 1.071),
    } : null,
  }

  const grandTotal = Object.values(totals).reduce((acc, t) => {
    if (!t) return acc
    return { invested: acc.invested + (t.invested || 0), current: acc.current + (t.current || 0) }
  }, { invested: 0, current: 0 })

  return (
    <PortfolioContext.Provider value={{
      ...state, totals, grandTotal,
      connectZerodha, disconnectZerodha,
      connectGroww, disconnectGroww,
      loadFDPPF, setActiveTab,
    }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}
