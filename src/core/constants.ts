import type { User, SessionOffer, SessionState, Notification, SessionContextType, HistoryLine, Framework } from './types';

// ── Simple Hash ────────────────────────────────────────────────────────

export function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(16).padStart(12, '0');
}

// ── Default Data ───────────────────────────────────────────────────────

export const DEFAULT_USERS: User[] = [
  { username: 'admin', passwordHash: simpleHash('admin123'), role: 'super_admin', email: 'admin@courier.app', createdAt: '2026-01-01' },
  { username: 'kiki', passwordHash: simpleHash('kiki123'), role: 'vendor', createdAt: '2026-01-15' },
];

export const DEFAULT_OFFERS: SessionOffer[] = [
  { code: 'OFR001', discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  { code: 'OFR002', discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  { code: 'OFR003', discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
];

export const DEFAULT_SESSION: SessionState = {
  currentUser: null,
  originalAdmin: null,
  users: DEFAULT_USERS,
  offers: DEFAULT_OFFERS,
  notifications: [],
};

// ── Notification Helper ────────────────────────────────────────────────

export function createNotification(to: string, subject: string, body: string): Notification {
  const now = new Date();
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.toISOString().replace('T', ' ').slice(0, 19),
    to,
    subject,
    body,
  };
}

// ── Fallback Session Context ───────────────────────────────────────────

export const FALLBACK_SESSION_CONTEXT: SessionContextType = {
  session: { currentUser: null, originalAdmin: null, users: [], offers: [], notifications: [] },
  login: () => ({ success: false, error: 'Not initialized' }),
  register: () => ({ success: false, error: 'Not initialized' }),
  loginAsGuest: () => { },
  logout: () => { },
  updateEmail: () => ({ success: false, error: 'Not initialized' }),
  processAdminCommand: () => null,
  getOffersForCalculation: () => ({}),
  isActingAsVendor: () => false,
  backToAdmin: () => { },
};

// ── Welcome Lines ──────────────────────────────────────────────────────

export const WELCOME_LINES: HistoryLine[] = [
  { type: 'system', text: '# ─────────────────────────────────────' },
  { type: 'system', text: '#  Courier Service App Calculator' },
  { type: 'system', text: '# ─────────────────────────────────────' },
  { type: 'system', text: '#' },
  { type: 'system', text: '#  Commands:' },
  { type: 'system', text: '#    login <username> <password>' },
  { type: 'system', text: '#    guest' },
  { type: 'system', text: '#    register <username> <password>' },
  { type: 'system', text: '#    clear' },
  { type: 'system', text: '#' },
  { type: 'system', text: '#  Default accounts:' },
  { type: 'system', text: '#    admin / admin123    (super_admin)' },
  { type: 'system', text: '#    kiki / kiki123      (vendor)' },
  { type: 'system', text: '#' },
  { type: 'system', text: '#  Register creates a vendor account.' },
  { type: 'system', text: '# ─────────────────────────────────────' },
];

// ── Framework Config ───────────────────────────────────────────────────

export const FRAMEWORK_CONFIG: Record<
  Framework,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  react: {
    label: 'React.js',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
  },
  vue: {
    label: 'Vue.js',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  svelte: {
    label: 'Svelte',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
  },
};
