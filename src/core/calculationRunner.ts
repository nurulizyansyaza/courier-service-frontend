import type { HistoryEntry, TransitPackage, CalculationType, TabData, ParsedResult } from './types';
import {
  calculateDeliveryCost,
  calculateDeliveryTimeWithTransit,
  parseOutput,
} from '@nurulizyansyaza/courier-service-core';
import {
  buildResultHistory,
  buildCostTabUpdates,
  buildTimeTabUpdates,
  buildFailureResult,
} from './resultBuilders';

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

async function fetchCostFromApi(input: string): Promise<{ output: string; parsedResults: ParsedResult[] } | { apiError: string } | null> {
  const res = await fetch('/api/cost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      if (errorData.error) return { apiError: errorData.error };
    } catch { /* response wasn't JSON — fall through */ }
    return null;
  }

  const data = await res.json();
  const output = (data.results as Array<{ id: string; discount: number; cost: number }>)
    .map(r => `${r.id} ${r.discount} ${r.cost}`)
    .join('\n');
  return { output, parsedResults: parseOutput(output, 'cost', input, []) };
}

async function fetchTimeFromApi(
  input: string,
  transitPackages: TransitPackage[],
): Promise<{
  output: string;
  parsedResults: ParsedResult[];
  updatedTransit: TransitPackage[];
  renamedPackages?: { oldId: string; newId: string }[];
} | { apiError: string } | null> {
  const res = await fetch('/api/delivery/transit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, transitPackages }),
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      if (errorData.error) return { apiError: errorData.error };
    } catch { /* response wasn't JSON — fall through */ }
    return null;
  }

  const data = await res.json() as {
    output: string;
    stillInTransit: TransitPackage[];
    newTransitPackages: TransitPackage[];
    renamedPackages?: Record<string, string>;
  };
  const updatedTransit = [...(data.stillInTransit || []), ...(data.newTransitPackages || [])];
  const parsedResults = parseOutput(data.output, 'time', input, transitPackages);
  const renamedPackages = data.renamedPackages
    ? Object.entries(data.renamedPackages).map(([oldId, newId]) => ({ oldId, newId }))
    : undefined;
  return { output: data.output, parsedResults, updatedTransit, renamedPackages };
}

async function runViaApi(
  input: string,
  calculationType: CalculationType,
  transitPackages: TransitPackage[],
): Promise<CalculationResult | null> {
  try {
    if (calculationType === 'cost') {
      const result = await fetchCostFromApi(input);
      if (!result) return null;
      if ('apiError' in result) return buildFailureResult(result.apiError);
      return {
        success: true,
        output: result.output,
        historyEntries: buildResultHistory(result.output, result.parsedResults, 'cost'),
        tabUpdates: buildCostTabUpdates(result.output),
      };
    } else {
      const result = await fetchTimeFromApi(input, transitPackages);
      if (!result) return null;
      if ('apiError' in result) return buildFailureResult(result.apiError);
      return {
        success: true,
        output: result.output,
        historyEntries: buildResultHistory(result.output, result.parsedResults, 'time'),
        tabUpdates: buildTimeTabUpdates(result.output, result.updatedTransit, transitPackages, result.renamedPackages),
      };
    }
  } catch {
    return null;
  }
}

function runLocally(
  input: string,
  calculationType: CalculationType,
  transitPackages: TransitPackage[],
): CalculationResult {
  if (calculationType === 'cost') {
    const output = calculateDeliveryCost(input);
    const parsedResults = parseOutput(output, 'cost', input, []);
    return {
      success: true,
      output,
      historyEntries: buildResultHistory(output, parsedResults, 'cost'),
      tabUpdates: buildCostTabUpdates(output),
    };
  } else {
    const transitResult = calculateDeliveryTimeWithTransit(input, transitPackages);
    const updatedTransit = [...transitResult.stillInTransit, ...transitResult.newTransitPackages];
    const parsedResults = parseOutput(transitResult.output, 'time', input, transitPackages);
    return {
      success: true,
      output: transitResult.output,
      historyEntries: buildResultHistory(transitResult.output, parsedResults, 'time'),
      tabUpdates: buildTimeTabUpdates(transitResult.output, updatedTransit, transitPackages, transitResult.renamedPackages),
    };
  }
}

/**
 * Run a calculation via the API, falling back to local core library if the API
 * is unreachable. This keeps the app functional offline while leveraging the
 * API's security middleware (rate limiting, validation) when available.
 */
export async function runCalculation(
  input: string,
  calculationType: CalculationType,
  transitPackages: TransitPackage[],
): Promise<CalculationResult> {
  const apiResult = await runViaApi(input, calculationType, transitPackages);
  if (apiResult) return apiResult;

  try {
    return runLocally(input, calculationType, transitPackages);
  } catch (err) {
    return buildFailureResult(err instanceof Error ? err.message : 'Invalid input');
  }
}
