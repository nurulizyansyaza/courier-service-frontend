import type { SessionState, SessionContextType, CalcOfferCriteria } from '../core/types';
import { DEFAULT_SESSION, FALLBACK_SESSION_CONTEXT } from '../core/constants';
import { getOffersForCalculation as getOffersForCalcPure } from '../core/sessionLogic';
import { getContext, setContext } from 'svelte';

const SESSION_KEY = Symbol('Session');

export function createSession(): SessionContextType {
  const session: SessionState = $state({
    offers: [...DEFAULT_SESSION.offers],
  });

  const getOffersForCalculation = (): Record<string, CalcOfferCriteria> => {
    return getOffersForCalcPure(session);
  };

  const ctx: SessionContextType = {
    session,
    getOffersForCalculation,
  };

  setContext(SESSION_KEY, ctx);
  return ctx;
}

export function useSession(): SessionContextType {
  return getContext<SessionContextType>(SESSION_KEY) ?? FALLBACK_SESSION_CONTEXT;
}
