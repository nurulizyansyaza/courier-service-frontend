// ── Courier Calculation Types ──────────────────────────────────────────

export interface Package {
  id: string;
  weight: number;
  distance: number;
  offerCode?: string;
}

/** Numeric-only offer criteria used by the calculation engine */
export interface CalcOfferCriteria {
  discount: number;
  minDistance: number;
  maxDistance: number;
  minWeight: number;
  maxWeight: number;
}

export interface DeliveryResult {
  id: string;
  discount: number;
  totalCost: number;
  deliveryTime?: number;
  offerCode?: string;
  baseCost: number;
  weight: number;
  distance: number;
  deliveryCost: number;
  deliveryRound?: number;
  vehicleId?: number;
  packagesRemaining?: number;
  currentTime?: number;
  vehicleReturnTime?: number;
  roundTripTime?: number;
  undeliverable?: boolean;
  undeliverableReason?: string;
}

export interface ParsedResult {
  id: string;
  discount: string;
  totalCost: string;
  deliveryTime?: string;
  offerApplied?: string;
  baseCost: number;
  weight: number;
  distance: number;
  deliveryCost: number;
  deliveryRound?: number;
  vehicleId?: number;
  packagesRemaining?: number;
  currentTime?: number;
  vehicleReturnTime?: number;
  roundTripTime?: number;
  undeliverable?: boolean;
  undeliverableReason?: string;
  renamedFrom?: string;
}

export interface TransitPackageInput {
  id: string;
  weight: number;
  distance: number;
  offerCode: string;
}

export interface TransitAwareResult {
  output: string;
  newTransitPackages: TransitPackageInput[];
  clearedFromTransit: TransitPackageInput[];
  stillInTransit: TransitPackageInput[];
  renamedPackages: { oldId: string; newId: string }[];
}

// ── Session Types ──────────────────────────────────────────────────────

/** Session-level offer with code identifier */
export interface SessionOffer {
  code: string;
  discount: number;
  minDistance: number;
  maxDistance: number;
  minWeight: number;
  maxWeight: number;
}

export interface SessionState {
  offers: SessionOffer[];
}

export interface SessionContextType {
  session: SessionState;
  getOffersForCalculation: () => Record<string, CalcOfferCriteria>;
}

// ── UI Types ───────────────────────────────────────────────────────────

export type CalculationType = 'cost' | 'time';

export interface TransitPackage {
  id: string;
  weight: number;
  distance: number;
  offerCode: string;
}

export interface TabData {
  id: string;
  title: string;
  calculationType: CalculationType;
  input: string;
  output: string;
  error: string;
  hasExecuted: boolean;
  transitPackages: TransitPackage[];
  executionTransitSnapshot: TransitPackage[];
  renamedPackages: { oldId: string; newId: string }[];
  isGenerating: boolean;
}

export interface HistoryLine {
  type: 'input' | 'output' | 'error' | 'system' | 'success';
  text: string;
}

export type Framework = 'react' | 'vue' | 'svelte';

export interface CommandHistoryEntry {
  input: string;
  output: string;
  isError: boolean;
}

export interface HistoryEntry {
  type: 'input' | 'output' | 'result' | 'command' | 'error' | 'info' | 'clear' | 'welcome';
  content: string;
  parsedResults?: ParsedResult[];
  calculationType?: 'cost' | 'time';
  timestamp?: number;
}
