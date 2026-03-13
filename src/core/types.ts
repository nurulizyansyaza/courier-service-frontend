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

// ── Session / Auth Types ───────────────────────────────────────────────

export type UserRole = 'super_admin' | 'vendor' | 'guest';

export interface User {
  username: string;
  passwordHash: string;
  role: UserRole;
  email?: string;
  createdAt: string;
}

/** Session-level offer with code identifier and optional vendor scope */
export interface SessionOffer {
  code: string;
  discount: number;
  minDistance: number;
  maxDistance: number;
  minWeight: number;
  maxWeight: number;
  vendor?: string;
}

export interface Notification {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  body: string;
}

export interface SessionState {
  currentUser: { username: string; role: UserRole } | null;
  originalAdmin: { username: string; role: UserRole } | null;
  users: User[];
  offers: SessionOffer[];
  notifications: Notification[];
}

export interface AdminResult {
  type: 'user-list' | 'user-add' | 'user-edit' | 'user-delete' |
  'offer-list' | 'offer-add' | 'offer-edit' | 'offer-delete' |
  'error' | 'help' | 'login-as' | 'back-to-admin' | 'notification-list';
  success: boolean;
  message: string;
  data?: User[] | SessionOffer[] | User | SessionOffer | Notification[];
}

export interface SessionContextType {
  session: SessionState;
  login: (username: string, password: string) => { success: boolean; error?: string };
  register: (username: string, password: string) => { success: boolean; error?: string };
  loginAsGuest: () => void;
  logout: () => void;
  updateEmail: (email: string) => { success: boolean; error?: string };
  processAdminCommand: (input: string) => AdminResult | null;
  getOffersForCalculation: () => Record<string, CalcOfferCriteria>;
  isActingAsVendor: () => boolean;
  backToAdmin: () => void;
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
  commandType: 'delivery' | 'admin';
  adminResult?: AdminResult;
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
