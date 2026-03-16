import type { HistoryEntry, TransitPackage, CalculationType, TabData, ParsedResult } from './types';

/** Build the standard pair of history entries for a successful calculation */
export function buildResultHistory(
  output: string,
  parsedResults: ParsedResult[],
  calculationType: CalculationType,
): HistoryEntry[] {
  return [
    { type: 'output', content: output },
    { type: 'result', content: '', parsedResults, calculationType },
  ];
}

/** Build tab updates for a cost calculation */
export function buildCostTabUpdates(output: string): Partial<TabData> {
  return { output, error: '', hasExecuted: true };
}

/** Build tab updates for a time calculation */
export function buildTimeTabUpdates(
  output: string,
  updatedTransit: TransitPackage[],
  previousTransit: TransitPackage[],
  renamedPackages?: { oldId: string; newId: string }[],
): Partial<TabData> {
  return {
    output,
    error: '',
    hasExecuted: true,
    transitPackages: updatedTransit,
    executionTransitSnapshot: [...previousTransit],
    renamedPackages,
  };
}

/** Build a failure result */
export function buildFailureResult(
  errorMsg: string,
): {
  success: false;
  errorMsg: string;
  historyEntries: HistoryEntry[];
  tabUpdates: Partial<TabData>;
} {
  return {
    success: false,
    errorMsg,
    historyEntries: [{ type: 'error', content: errorMsg }],
    tabUpdates: { output: '', error: errorMsg, hasExecuted: true },
  };
}
