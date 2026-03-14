import { reactive, type InjectionKey, inject, provide } from 'vue';
import type { SessionState, SessionContextType, CalcOfferCriteria } from '../core/types';
import { DEFAULT_SESSION, FALLBACK_SESSION_CONTEXT } from '../core/constants';
import { getOffersForCalculation as getOffersForCalcPure } from '../core/sessionLogic';

export const SessionKey: InjectionKey<SessionContextType> = Symbol('Session');

export function provideSession() {
  const session = reactive<SessionState>({
    offers: [...DEFAULT_SESSION.offers],
  });

  const getOffersForCalculation = (): Record<string, CalcOfferCriteria> => {
    return getOffersForCalcPure(session);
  };

  const ctx: SessionContextType = {
    session,
    getOffersForCalculation,
  };

  provide(SessionKey, ctx);
  return ctx;
}

export function useSession(): SessionContextType {
  const ctx = inject(SessionKey);
  if (!ctx) return FALLBACK_SESSION_CONTEXT;
  return ctx;
}
