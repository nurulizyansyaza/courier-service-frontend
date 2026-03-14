import type { SessionState, CalcOfferCriteria } from './types';

// ── Get Offers for Calculation ─────────────────────────────────────────

export function getOffersForCalculation(
  session: SessionState,
): Record<string, CalcOfferCriteria> {
  const record: Record<string, CalcOfferCriteria> = {};
  for (const o of session.offers) {
    record[o.code] = {
      discount: o.discount,
      minDistance: o.minDistance,
      maxDistance: o.maxDistance,
      minWeight: o.minWeight,
      maxWeight: o.maxWeight,
    };
  }
  return record;
}
