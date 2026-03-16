import { describe, it, expect } from 'vitest';
import {
  buildResultHistory,
  buildCostTabUpdates,
  buildTimeTabUpdates,
  buildFailureResult,
} from '../core/resultBuilders';

describe('resultBuilders', () => {
  describe('buildResultHistory', () => {
    it('should create output and result history entries', () => {
      const entries = buildResultHistory('output text', [{ id: 'PKG1' } as any], 'cost');
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({ type: 'output', content: 'output text' });
      expect(entries[1].type).toBe('result');
      expect(entries[1].parsedResults).toHaveLength(1);
      expect(entries[1].calculationType).toBe('cost');
    });
  });

  describe('buildCostTabUpdates', () => {
    it('should set output and clear error', () => {
      const updates = buildCostTabUpdates('PKG1 0 175');
      expect(updates.output).toBe('PKG1 0 175');
      expect(updates.error).toBe('');
      expect(updates.hasExecuted).toBe(true);
    });
  });

  describe('buildTimeTabUpdates', () => {
    it('should include transit packages and snapshot', () => {
      const transit = [{ id: 'PKG1' }] as any[];
      const previous = [{ id: 'PKG0' }] as any[];
      const updates = buildTimeTabUpdates('output', transit, previous);
      expect(updates.transitPackages).toBe(transit);
      expect(updates.executionTransitSnapshot).toEqual(previous);
      expect(updates.hasExecuted).toBe(true);
    });

    it('should include renamed packages when provided', () => {
      const renamed = [{ oldId: 'A', newId: 'B' }];
      const updates = buildTimeTabUpdates('output', [], [], renamed);
      expect(updates.renamedPackages).toBe(renamed);
    });

    it('should handle undefined renamed packages', () => {
      const updates = buildTimeTabUpdates('output', [], []);
      expect(updates.renamedPackages).toBeUndefined();
    });
  });

  describe('buildFailureResult', () => {
    it('should create failure with error message', () => {
      const result = buildFailureResult('Something went wrong');
      expect(result.success).toBe(false);
      expect(result.errorMsg).toBe('Something went wrong');
      expect(result.historyEntries[0].type).toBe('error');
      expect(result.tabUpdates.error).toBe('Something went wrong');
      expect(result.tabUpdates.hasExecuted).toBe(true);
    });
  });
});
