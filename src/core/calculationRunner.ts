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

async function runViaApi(
  input: string,
  calculationType: CalculationType,
  transitPackages: TransitPackage[],
): Promise<CalculationResult | null> {
  try {
    const url = calculationType === 'cost' ? '/api/cost' : '/api/delivery/transit';
    const body: Record<string, unknown> = { input };
    if (calculationType === 'time') {
      body.transitPackages = transitPackages;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return {
        success: false,
        errorMsg: data.error || `API error ${res.status}`,
        historyEntries: [{ type: 'error', content: data.error || `API error ${res.status}` }],
        tabUpdates: { output: '', error: data.error, hasExecuted: true },
      };
    }

    const data = await res.json();

    if (calculationType === 'cost') {
      const output = (data.results as Array<{ id: string; discount: number; cost: number }>)
        .map(r => `${r.id} ${r.discount} ${r.cost}`)
        .join('\n');
      const parsedResults = parseOutput(output, 'cost', input, []);
      return {
        success: true,
        output,
        historyEntries: [
          { type: 'output', content: output },
          { type: 'result', content: '', parsedResults, calculationType: 'cost' },
        ],
        tabUpdates: { output, error: '', hasExecuted: true },
      };
    } else {
      const transitResult = data as {
        output: string;
        stillInTransit: TransitPackage[];
        newTransitPackages: TransitPackage[];
        renamedPackages?: Record<string, string>;
      };
      const updatedTransit = [...(transitResult.stillInTransit || []), ...(transitResult.newTransitPackages || [])];
      const parsedResults = parseOutput(transitResult.output, 'time', input, transitPackages);
      const renamedArr = transitResult.renamedPackages
        ? Object.entries(transitResult.renamedPackages).map(([oldId, newId]) => ({ oldId, newId }))
        : undefined;
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
          renamedPackages: renamedArr,
        },
      };
    }
  } catch {
    // Network error — fall back to local
    return null;
  }
}

function runLocally(
  input: string,
  calculationType: CalculationType,
  transitPackages: TransitPackage[],
): CalculationResult {
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
  // Try API first
  const apiResult = await runViaApi(input, calculationType, transitPackages);
  if (apiResult) return apiResult;

  // Fallback to local calculation
  try {
    return runLocally(input, calculationType, transitPackages);
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
