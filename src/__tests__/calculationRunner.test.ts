import { runCalculation } from '@/core/calculationRunner';

describe('runCalculation', () => {
  describe('cost calculation', () => {
    it('returns success with output and history for valid input', () => {
      const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
      const result = runCalculation(input, 'cost', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeTruthy();
        expect(result.historyEntries).toHaveLength(2);
        expect(result.historyEntries[0].type).toBe('output');
        expect(result.historyEntries[1].type).toBe('result');
        expect(result.historyEntries[1].calculationType).toBe('cost');
        expect(result.tabUpdates.hasExecuted).toBe(true);
        expect(result.tabUpdates.error).toBe('');
      }
    });

    it('result contains parsedResults in historyEntries', () => {
      const input = '100 1\nPKG1 50 100 OFR001';
      const result = runCalculation(input, 'cost', []);

      expect(result.success).toBe(true);
      if (result.success) {
        const resultEntry = result.historyEntries[1];
        expect(resultEntry.parsedResults).toBeDefined();
        expect(resultEntry.parsedResults!.length).toBeGreaterThan(0);
        expect(resultEntry.parsedResults![0].id).toBe('PKG1');
      }
    });
  });

  describe('time calculation', () => {
    it('returns success with valid input and empty transit', () => {
      const input = '100 5\nPKG1 50 30 OFR001\nPKG2 75 125 OFR002\nPKG3 175 100 OFR003\nPKG4 110 60 OFR002\nPKG5 155 95 OFR001\n2 70 200';
      const result = runCalculation(input, 'time', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeTruthy();
        expect(result.historyEntries).toHaveLength(2);
        expect(result.historyEntries[1].calculationType).toBe('time');
        expect(result.tabUpdates.hasExecuted).toBe(true);
      }
    });

    it('updates transitPackages in tabUpdates', () => {
      const input = '100 5\nPKG1 50 30 OFR001\nPKG2 75 125 OFR002\nPKG3 175 100 OFR003\nPKG4 110 60 OFR002\nPKG5 155 95 OFR001\n2 70 200';
      const result = runCalculation(input, 'time', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.tabUpdates).toHaveProperty('transitPackages');
        expect(result.tabUpdates).toHaveProperty('executionTransitSnapshot');
        expect(result.tabUpdates).toHaveProperty('renamedPackages');
      }
    });
  });

  describe('invalid input', () => {
    it('returns failure with error message', () => {
      const result = runCalculation('invalid input', 'cost', []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorMsg).toBeTruthy();
        expect(result.historyEntries).toHaveLength(1);
        expect(result.historyEntries[0].type).toBe('error');
        expect(result.tabUpdates.hasExecuted).toBe(true);
        expect(result.tabUpdates.error).toBeTruthy();
      }
    });
  });
});
