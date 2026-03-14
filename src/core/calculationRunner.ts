import type { HistoryEntry, TransitPackage, CalculationType, TabData, ParsedResult } from './types';
import {
  calculateDeliveryCost,
  calculateDeliveryTimeWithTransit,
  parseOutput,
} from './calculations';

export interface CalculationSuccess {
  success: true;
  output: string;
  historyEntries: HistoryEntry[];
  tabUpdates: Partial<TabData>;
}

export interface CalculationFailure {
  success: false;
  errorMsg: string;
  historyEntries: HistoryEntry[];
  tabUpdates: Partial<TabData>;
}

export type CalculationResult = CalculationSuccess | CalculationFailure;

export function runCalculation(
  input: string,
  calculationType: CalculationType,
  transitPackages: TransitPackage[],
): CalculationResult {
  try {
    if (calculationType === 'cost') {
      const result = calculateDeliveryCost(input);
      const parsedResults = parseOutput(result, 'cost', input, []);
      return {
        success: true,
        output: result,
        historyEntries: [
          { type: 'output', content: result },
          { type: 'result', content: '', parsedResults, calculationType: 'cost' },
        ],
        tabUpdates: { output: result, error: '', hasExecuted: true },
      };
    } else {
      const transitResult = calculateDeliveryTimeWithTransit(input, transitPackages);
      const updatedTransit = [...transitResult.stillInTransit, ...transitResult.newTransitPackages];
      const parsedResults = parseOutput(transitResult.output, 'time', input, transitPackages);
      return {
        success: true,
        output: transitResult.output,
        historyEntries: [
          { type: 'output', content: transitResult.output },
          { type: 'result', content: '', parsedResults, calculationType: 'time' },
        ],
        tabUpdates: {
          output: transitResult.output, error: '', hasExecuted: true,
          transitPackages: updatedTransit,
          executionTransitSnapshot: [...transitPackages],
          renamedPackages: transitResult.renamedPackages,
        },
      };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid input';
    return {
      success: false,
      errorMsg,
      historyEntries: [{ type: 'error', content: errorMsg }],
      tabUpdates: { output: '', error: errorMsg, hasExecuted: true },
    };
  }
}
