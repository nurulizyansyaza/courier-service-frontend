import { describe, it, expect } from 'vitest';
import {
  sortDeliveryResults,
  getDiscountPercent,
  isScrolledToBottom,
  resizeTextarea,
} from '../core/terminalHelpers';
import type { ParsedResult } from '../core/types';

function makeResult(overrides: Partial<ParsedResult> = {}): ParsedResult {
  return {
    id: 'PKG1',
    discount: '0',
    totalCost: 100,
    deliveryCost: 100,
    weight: 10,
    distance: 50,
    ...overrides,
  };
}

describe('terminalHelpers', () => {
  describe('sortDeliveryResults', () => {
    it('should return results unchanged for cost mode', () => {
      const results = [
        makeResult({ id: 'A', weight: 5 }),
        makeResult({ id: 'B', weight: 50 }),
        makeResult({ id: 'C', weight: 20 }),
      ];
      const sorted = sortDeliveryResults(results, 'cost');
      expect(sorted.map(r => r.id)).toEqual(['A', 'B', 'C']);
    });

    it('should sort undeliverable items last in time mode', () => {
      const results = [
        makeResult({ id: 'A', undeliverable: true }),
        makeResult({ id: 'B', undeliverable: false, deliveryRound: 1 }),
        makeResult({ id: 'C', undeliverable: false, deliveryRound: 2 }),
      ];
      const sorted = sortDeliveryResults(results, 'time');
      expect(sorted.map(r => r.id)).toEqual(['B', 'C', 'A']);
    });

    it('should sort by delivery round ascending in time mode', () => {
      const results = [
        makeResult({ id: 'A', deliveryRound: 3 }),
        makeResult({ id: 'B', deliveryRound: 1 }),
        makeResult({ id: 'C', deliveryRound: 2 }),
      ];
      const sorted = sortDeliveryResults(results, 'time');
      expect(sorted.map(r => r.id)).toEqual(['B', 'C', 'A']);
    });

    it('should sort by weight descending within same round', () => {
      const results = [
        makeResult({ id: 'A', deliveryRound: 1, weight: 5 }),
        makeResult({ id: 'B', deliveryRound: 1, weight: 50 }),
        makeResult({ id: 'C', deliveryRound: 1, weight: 20 }),
      ];
      const sorted = sortDeliveryResults(results, 'time');
      expect(sorted.map(r => r.id)).toEqual(['B', 'C', 'A']);
    });

    it('should handle empty results', () => {
      expect(sortDeliveryResults([], 'time')).toEqual([]);
    });

    it('should handle missing delivery round as Infinity', () => {
      const results = [
        makeResult({ id: 'A' }), // no deliveryRound
        makeResult({ id: 'B', deliveryRound: 1 }),
      ];
      const sorted = sortDeliveryResults(results, 'time');
      expect(sorted.map(r => r.id)).toEqual(['B', 'A']);
    });

    it('should not mutate original array', () => {
      const results = [
        makeResult({ id: 'A', deliveryRound: 2 }),
        makeResult({ id: 'B', deliveryRound: 1 }),
      ];
      const original = [...results];
      sortDeliveryResults(results, 'time');
      expect(results.map(r => r.id)).toEqual(original.map(r => r.id));
    });

    it('should return unchanged for undefined calculationType', () => {
      const results = [
        makeResult({ id: 'A', weight: 5 }),
        makeResult({ id: 'B', weight: 50 }),
      ];
      const sorted = sortDeliveryResults(results);
      expect(sorted.map(r => r.id)).toEqual(['A', 'B']);
    });
  });

  describe('getDiscountPercent', () => {
    it('should calculate discount percentage correctly', () => {
      const result = makeResult({ discount: '50', deliveryCost: 200 });
      expect(getDiscountPercent(result)).toBe('25');
    });

    it('should return 0 when discount is zero', () => {
      const result = makeResult({ discount: '0', deliveryCost: 100 });
      expect(getDiscountPercent(result)).toBe('0');
    });

    it('should return 0 when discount is negative', () => {
      const result = makeResult({ discount: '-10', deliveryCost: 100 });
      expect(getDiscountPercent(result)).toBe('0');
    });

    it('should return 0 when deliveryCost is zero', () => {
      const result = makeResult({ discount: '50', deliveryCost: 0 });
      expect(getDiscountPercent(result)).toBe('0');
    });

    it('should return 0 when discount is not a number', () => {
      const result = makeResult({ discount: 'abc', deliveryCost: 100 });
      expect(getDiscountPercent(result)).toBe('0');
    });

    it('should return 0 when discount is empty string', () => {
      const result = makeResult({ discount: '', deliveryCost: 100 });
      expect(getDiscountPercent(result)).toBe('0');
    });

    it('should round to nearest integer', () => {
      const result = makeResult({ discount: '33', deliveryCost: 100 });
      expect(getDiscountPercent(result)).toBe('33');
    });
  });

  describe('isScrolledToBottom', () => {
    function makeScrollable(scrollTop: number, scrollHeight: number, clientHeight: number) {
      return { scrollTop, scrollHeight, clientHeight } as HTMLElement;
    }

    it('should return true when scrolled to bottom', () => {
      const el = makeScrollable(900, 1000, 100);
      expect(isScrolledToBottom(el)).toBe(true);
    });

    it('should return true when within threshold', () => {
      const el = makeScrollable(860, 1000, 100);
      expect(isScrolledToBottom(el, 50)).toBe(true);
    });

    it('should return false when far from bottom', () => {
      const el = makeScrollable(0, 1000, 100);
      expect(isScrolledToBottom(el)).toBe(false);
    });

    it('should return true when content fits viewport (no scroll needed)', () => {
      const el = makeScrollable(0, 100, 100);
      expect(isScrolledToBottom(el)).toBe(true);
    });

    it('should use default threshold of 50', () => {
      const el = makeScrollable(849, 1000, 100);
      // 1000 - 849 - 100 = 51 > 50 → false
      expect(isScrolledToBottom(el)).toBe(false);
    });

    it('should respect custom threshold', () => {
      const el = makeScrollable(849, 1000, 100);
      // 1000 - 849 - 100 = 51 < 60 → true
      expect(isScrolledToBottom(el, 60)).toBe(true);
    });
  });

  describe('resizeTextarea', () => {
    function makeTextarea(scrollHeight: number): HTMLTextAreaElement {
      const el = document.createElement('textarea');
      Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
      return el;
    }

    it('should set height to scrollHeight when under max', () => {
      const el = makeTextarea(100);
      resizeTextarea(el);
      expect(el.style.height).toBe('100px');
    });

    it('should cap height at maxHeight', () => {
      const el = makeTextarea(300);
      resizeTextarea(el, 160);
      expect(el.style.height).toBe('160px');
    });

    it('should use default maxHeight of 160', () => {
      const el = makeTextarea(500);
      resizeTextarea(el);
      expect(el.style.height).toBe('160px');
    });

    it('should handle small content', () => {
      const el = makeTextarea(20);
      resizeTextarea(el);
      expect(el.style.height).toBe('20px');
    });

    it('should respect custom maxHeight', () => {
      const el = makeTextarea(300);
      resizeTextarea(el, 250);
      expect(el.style.height).toBe('250px');
    });
  });
});
