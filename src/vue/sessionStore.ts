import { reactive, type InjectionKey, inject, provide } from 'vue';
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

export const SessionKey: InjectionKey<SessionContextType> = Symbol('Session');

export function provideSession() {
  const session = reactive<SessionState>({
    ...DEFAULT_SESSION,
    users: [...DEFAULT_SESSION.users],
    offers: [...DEFAULT_SESSION.offers],
    notifications: [],
  });

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const result = loginUser(session, username, password);
    if (result.success) {
      Object.assign(session, result.session);
    }
    return { success: result.success, error: result.error };
  };

  const register = (username: string, password: string): { success: boolean; error?: string } => {
    const result = registerUser(session, username, password);
    if (result.success) {
      Object.assign(session, result.session);
    }
    return { success: result.success, error: result.error };
  };

  const loginAsGuest = () => {
    Object.assign(session, loginAsGuestPure(session));
  };

  const logout = () => {
    Object.assign(session, logoutUser(session));
  };

  const updateEmail = (email: string): { success: boolean; error?: string } => {
    const result = updateUserEmail(session, email);
    if (result.success) {
      Object.assign(session, result.session);
    }
    return { success: result.success, error: result.error };
  };

  const isActingAsVendor = (): boolean => {
    return isActingAsVendorPure(session);
  };

  const backToAdmin = () => {
    Object.assign(session, backToAdminPure(session));
  };

  const getOffersForCalculation = (): Record<string, CalcOfferCriteria> => {
    return getOffersForCalcPure(session);
  };

  const processAdminCommand = (input: string): AdminResult | null => {
    const { session: newSession, result } = processAdminCmdPure(session, input);
    Object.assign(session, newSession);
    return result;
  };

  const ctx: SessionContextType = {
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
  };

  provide(SessionKey, ctx);
  return ctx;
}

export function useSession(): SessionContextType {
  const ctx = inject(SessionKey);
  if (!ctx) return FALLBACK_SESSION_CONTEXT;
  return ctx;
}
