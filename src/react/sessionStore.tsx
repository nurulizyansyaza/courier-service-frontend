import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SessionState, SessionContextType, CalcOfferCriteria } from '../core/types';
import { DEFAULT_SESSION, FALLBACK_SESSION_CONTEXT } from '../core/constants';
import { getOffersForCalculation as getOffersForCalcPure } from '../core/sessionLogic';

// ── Context ────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextType>(FALLBACK_SESSION_CONTEXT);

export function useSession() {
  return useContext(SessionContext);
}

// ── Provider ───────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session] = useState<SessionState>({
    offers: [...DEFAULT_SESSION.offers],
  });

  const getOffersForCalculation = useCallback((): Record<string, CalcOfferCriteria> => {
    return getOffersForCalcPure(session);
  }, [session]);

  return (
    <SessionContext.Provider
      value={{
        session,
        getOffersForCalculation,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
