import { getOffersForCalculation } from '@/core/sessionLogic';
import type { SessionState } from '@/core/types';

describe('getOffersForCalculation', () => {
  it('should convert session offers to Record format', () => {
    // Given a session with offers
    const session: SessionState = {
      offers: [
        { code: 'OFR001', discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
        { code: 'OFR002', discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
      ],
    };

    // When converted
    const record = getOffersForCalculation(session);

    // Then it's keyed by code without the code field
    expect(Object.keys(record)).toEqual(['OFR001', 'OFR002']);
    expect(record.OFR001).toEqual({
      discount: 10,
      minDistance: 0,
      maxDistance: 200,
      minWeight: 70,
      maxWeight: 200,
    });
  });

  it('should return empty record for empty offers', () => {
    // Given a session with no offers
    const session: SessionState = { offers: [] };

    // When converted
    const record = getOffersForCalculation(session);

    // Then empty
    expect(record).toEqual({});
  });

  it('should preserve all offer criteria fields', () => {
    // Given a session with one offer
    const session: SessionState = {
      offers: [
        { code: 'TEST', discount: 15, minDistance: 10, maxDistance: 300, minWeight: 5, maxWeight: 500 },
      ],
    };

    // When converted
    const record = getOffersForCalculation(session);

    // Then all numeric fields are preserved
    expect(record.TEST.discount).toBe(15);
    expect(record.TEST.minDistance).toBe(10);
    expect(record.TEST.maxDistance).toBe(300);
    expect(record.TEST.minWeight).toBe(5);
    expect(record.TEST.maxWeight).toBe(500);
  });
});
