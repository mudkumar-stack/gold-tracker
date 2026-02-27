import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { requestOTP, verifyOTP, logout, restoreSession } from '../services/authService.js'

const AuthContext = createContext(null)

const initialState = {
  user: null,
  phase: 'idle',   // idle | requesting | otp_sent | verifying | authenticated | error
  error: null,
  transactionId: null,
  maskedMobile: null,
  demoOTP: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'REQUEST_START':  return { ...state, phase: 'requesting', error: null }
    case 'OTP_SENT':       return { ...state, phase: 'otp_sent', ...action.payload }
    case 'VERIFY_START':   return { ...state, phase: 'verifying', error: null }
    case 'AUTH_SUCCESS':   return { ...state, phase: 'authenticated', user: action.user, error: null, demoOTP: null }
    case 'AUTH_ERROR':     return { ...state, phase: state.phase === 'verifying' ? 'otp_sent' : 'idle', error: action.error }
    case 'LOGOUT':         return { ...initialState }
    case 'BACK_TO_AADHAR': return { ...state, phase: 'idle', error: null, transactionId: null, maskedMobile: null, demoOTP: null }
    default:               return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Restore session on mount
  useEffect(() => {
    const user = restoreSession()
    if (user) dispatch({ type: 'AUTH_SUCCESS', user })
  }, [])

  const sendOTP = useCallback(async (aadhar) => {
    dispatch({ type: 'REQUEST_START' })
    try {
      const result = await requestOTP(aadhar)
      dispatch({
        type: 'OTP_SENT',
        payload: {
          transactionId: result.transactionId,
          maskedMobile: result.maskedMobile,
          demoOTP: result.demoOTP,
        },
      })
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR', error: err.message })
    }
  }, [])

  const confirmOTP = useCallback(async (otp) => {
    dispatch({ type: 'VERIFY_START' })
    try {
      const user = await verifyOTP(otp, state.transactionId)
      dispatch({ type: 'AUTH_SUCCESS', user })
    } catch (err) {
      dispatch({ type: 'AUTH_ERROR', error: err.message })
    }
  }, [state.transactionId])

  const handleLogout = useCallback(() => {
    logout()
    dispatch({ type: 'LOGOUT' })
  }, [])

  const goBack = useCallback(() => dispatch({ type: 'BACK_TO_AADHAR' }), [])

  return (
    <AuthContext.Provider value={{ ...state, sendOTP, confirmOTP, logout: handleLogout, goBack }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
