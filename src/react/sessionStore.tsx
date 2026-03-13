import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SessionState, SessionContextType, AdminResult, CalcOfferCriteria } from '../core/types';
import { DEFAULT_SESSION, FALLBACK_SESSION_CONTEXT } from '../core/constants';
import {
  loginUser,
  registerUser,
  loginAsGuest as loginAsGuestPure,
  logoutUser,
  updateUserEmail,
  isActingAsVendor as isActingAsVendorPure,
  backToAdmin as backToAdminPure,
  getOffersForCalculation as getOffersForCalcPure,
  processAdminCommand as processAdminCmdPure,
} from '../core/sessionLogic';

// ── Context ────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextType>(FALLBACK_SESSION_CONTEXT);

export function useSession() {
  return useContext(SessionContext);
}

// ── Provider ───────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    ...DEFAULT_SESSION,
    users: [...DEFAULT_SESSION.users],
    offers: [...DEFAULT_SESSION.offers],
    notifications: [],
  });

  const login = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const result = loginUser(session, username, password);
    if (result.success) {
      setSession(result.session);
    }
    return { success: result.success, error: result.error };
  }, [session]);

  const register = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const result = registerUser(session, username, password);
    if (result.success) {
      setSession(result.session);
    }
    return { success: result.success, error: result.error };
  }, [session]);

  const loginAsGuest = useCallback(() => {
    setSession(loginAsGuestPure(session));
  }, [session]);

  const logout = useCallback(() => {
    setSession(logoutUser(session));
  }, [session]);

  const updateEmail = useCallback((email: string): { success: boolean; error?: string } => {
    const result = updateUserEmail(session, email);
    if (result.success) {
      setSession(result.session);
    }
    return { success: result.success, error: result.error };
  }, [session]);

  const isActingAsVendor = useCallback(() => {
    return isActingAsVendorPure(session);
  }, [session]);

  const backToAdmin = useCallback(() => {
    setSession(backToAdminPure(session));
  }, [session]);

  const getOffersForCalculation = useCallback((): Record<string, CalcOfferCriteria> => {
    return getOffersForCalcPure(session);
  }, [session]);

  const processAdminCommand = useCallback((input: string): AdminResult | null => {
    const { session: newSession, result } = processAdminCmdPure(session, input);
    setSession(newSession);
    return result;
  }, [session]);

  return (
    <SessionContext.Provider
      value={{
        session,
        login,
        register,
        loginAsGuest,
        logout,
        updateEmail,
        processAdminCommand,
        getOffersForCalculation,
        isActingAsVendor,
        backToAdmin,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
