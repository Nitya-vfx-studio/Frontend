import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

/**
 * A reactive hook to access global session context, tokens, loading states, and actions.
 * @returns {{
 *   user: object|null,
 *   token: string|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   loginAction: (username, password) => Promise<object>,
 *   logoutAction: () => void,
 *   updateUserAction: (data: object) => void
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be consumed within an AuthProvider')
  }
  return context
}
