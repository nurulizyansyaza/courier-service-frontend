import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'vendor' | 'guest';

export interface User {
  username: string;
  passwordHash: string;
  role: UserRole;
  email?: string;
  createdAt: string;
}

export interface OfferCriteria {
  code: string;
  discount: number;
  minDistance: number;
  maxDistance: number;
  minWeight: number;
  maxWeight: number;
  vendor?: string; // If set, offer belongs to this vendor only; otherwise global
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
  /** When super_admin uses "login as vendor", track original admin identity */
  originalAdmin: { username: string; role: UserRole } | null;
  users: User[];
  offers: OfferCriteria[];
  notifications: Notification[];
}

export interface AdminResult {
  type: 'user-list' | 'user-add' | 'user-edit' | 'user-delete' |
        'offer-list' | 'offer-add' | 'offer-edit' | 'offer-delete' |
        'error' | 'help' | 'login-as' | 'back-to-admin' | 'notification-list';
  success: boolean;
  message: string;
  data?: User[] | OfferCriteria[] | User | OfferCriteria | Notification[];
}

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

const DEFAULT_USERS: User[] = [
  { username: 'admin', passwordHash: simpleHash('admin123'), role: 'super_admin', email: 'admin@courier.app', createdAt: '2026-01-01' },
  { username: 'kiki', passwordHash: simpleHash('kiki123'), role: 'vendor', createdAt: '2026-01-15' },
];

const DEFAULT_OFFERS: OfferCriteria[] = [
  { code: 'OFR001', discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  { code: 'OFR002', discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  { code: 'OFR003', discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
];

// ── Context ────────────────────────────────────────────────────────────

interface SessionContextType {
  session: SessionState;
  login: (username: string, password: string) => { success: boolean; error?: string };
  register: (username: string, password: string) => { success: boolean; error?: string };
  loginAsGuest: () => void;
  logout: () => void;
  updateEmail: (email: string) => { success: boolean; error?: string };
  processAdminCommand: (input: string) => AdminResult | null;
  getOffersForCalculation: () => Record<string, { discount: number; minDistance: number; maxDistance: number; minWeight: number; maxWeight: number }>;
  isActingAsVendor: () => boolean;
  backToAdmin: () => void;
}

// Fallback context value for edge cases (hot-reload, etc.)
const FALLBACK: SessionContextType = {
  session: { currentUser: null, originalAdmin: null, users: [], offers: [], notifications: [] },
  login: () => ({ success: false, error: 'Not initialized' }),
  register: () => ({ success: false, error: 'Not initialized' }),
  loginAsGuest: () => {},
  logout: () => {},
  updateEmail: () => ({ success: false, error: 'Not initialized' }),
  processAdminCommand: () => null,
  getOffersForCalculation: () => ({}),
  isActingAsVendor: () => false,
  backToAdmin: () => {},
};

const SessionContext = createContext<SessionContextType>(FALLBACK);

export function useSession() {
  return useContext(SessionContext);
}

// ── Helper: create notification ────────────────────────────────────────

function createNotification(to: string, subject: string, body: string): Notification {
  const now = new Date();
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.toISOString().replace('T', ' ').slice(0, 19),
    to,
    subject,
    body,
  };
}

// ── Provider ───────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    currentUser: null,
    originalAdmin: null,
    users: [...DEFAULT_USERS],
    offers: [...DEFAULT_OFFERS],
    notifications: [],
  });

  const login = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const user = session.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { success: false, error: 'User not found' };
    if (user.role === 'guest') return { success: false, error: 'Guest accounts do not require login. Type: guest' };
    if (user.passwordHash !== simpleHash(password)) return { success: false, error: 'Invalid password' };
    setSession(prev => ({ ...prev, currentUser: { username: user.username, role: user.role }, originalAdmin: null }));
    return { success: true };
  }, [session.users]);

  // Register only creates vendor accounts
  const register = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    if (!username || !password) {
      return { success: false, error: 'Usage: register <username> <password>' };
    }
    if (session.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: `User "${username}" already exists` };
    }
    const newUser: User = {
      username: username,
      passwordHash: simpleHash(password),
      role: 'vendor',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSession(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      currentUser: { username: newUser.username, role: newUser.role },
      originalAdmin: null,
    }));
    return { success: true };
  }, [session.users]);

  const loginAsGuest = useCallback(() => {
    setSession(prev => ({ ...prev, currentUser: { username: 'guest', role: 'guest' }, originalAdmin: null }));
  }, []);

  const logout = useCallback(() => {
    setSession(prev => ({ ...prev, currentUser: null, originalAdmin: null }));
  }, []);

  const updateEmail = useCallback((email: string): { success: boolean; error?: string } => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    const currentUsername = session.currentUser?.username;
    if (!currentUsername) return { success: false, error: 'Not logged in' };

    setSession(prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.username.toLowerCase() === currentUsername.toLowerCase()
          ? { ...u, email }
          : u
      ),
    }));
    return { success: true };
  }, [session.currentUser]);

  const isActingAsVendor = useCallback(() => {
    return session.originalAdmin !== null;
  }, [session.originalAdmin]);

  const backToAdmin = useCallback(() => {
    if (session.originalAdmin) {
      setSession(prev => ({
        ...prev,
        currentUser: prev.originalAdmin,
        originalAdmin: null,
      }));
    }
  }, [session.originalAdmin]);

  const getOffersForCalculation = useCallback(() => {
    const currentUsername = session.currentUser?.username;
    const currentRole = session.currentUser?.role;
    const record: Record<string, { discount: number; minDistance: number; maxDistance: number; minWeight: number; maxWeight: number }> = {};
    for (const o of session.offers) {
      // Global offers (no vendor) are available to everyone
      // Vendor-specific offers only available to that vendor (or admin sees all)
      if (!o.vendor || currentRole === 'super_admin' || (o.vendor && o.vendor.toLowerCase() === currentUsername?.toLowerCase())) {
        record[o.code] = { discount: o.discount, minDistance: o.minDistance, maxDistance: o.maxDistance, minWeight: o.minWeight, maxWeight: o.maxWeight };
      }
    }
    return record;
  }, [session.offers, session.currentUser]);

  // ── Helper: parse --to-only:<vendor> flag from parts ──
  const parseToOnlyFlag = (parts: string[]): { vendor: string | null; remaining: string[] } => {
    const remaining: string[] = [];
    let vendor: string | null = null;
    for (const p of parts) {
      const match = p.match(/^--to-only:(.+)$/i);
      if (match) {
        vendor = match[1];
      } else {
        remaining.push(p);
      }
    }
    return { vendor, remaining };
  };

  const processAdminCommand = useCallback((input: string): AdminResult | null => {
    const trimmed = input.trim();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const role = session.currentUser?.role;
    const isAdmin = role === 'super_admin';

    // Determine which top-level commands we handle
    const handledCmds = ['user', 'offer', 'help', 'loginas', 'notifications'];
    // Also handle "loginas:<vendor>" format
    if (!handledCmds.some(c => cmd === c || cmd?.startsWith(c + ':'))) return null;

    // ── Help ──
    if (cmd === 'help') {
      const lines = [
        'Available commands:',
        '',
      ];
      if (isAdmin) {
        lines.push(
          '  User Management (super_admin):',
          '  user list                                          - List registered vendors',
          '  user add:<username> <email>                        - Add vendor (no password — set by vendor)',
          '  user edit:email:<username> <new_email>             - Edit vendor email',
          '  user delete:<username>                             - Delete vendor',
          '  loginas:<vendor>                                   - Login as a vendor',
          '',
        );
      }
      if (isAdmin || role === 'vendor') {
        lines.push(
          '  Offer Management:',
          '  offer list                                         - List all offers',
          '  offer list --to-only:<vendor>                      - List offers for a vendor',
          '  offer add <code> <disc> <minD> <maxD> <minW> <maxW>',
          '                                                     - Add global offer',
          '  offer --add-to-only:<vendor> <code> <disc> <minD> <maxD> <minW> <maxW>',
          '                                                     - Add offer for specific vendor',
          '  offer edit:<field> <code> <value>                  - Edit offer field',
          '  offer edit:<field> --to-only:<vendor> <code> <val> - Edit vendor offer field',
          '  offer edit:code <old>:<new>                        - Rename offer code',
          '  offer edit:code --to-only:<vendor> <old>:<new>     - Rename vendor offer code',
          '  offer delete:<code>                                - Delete offer',
          '  offer delete:<code> --to-only:<vendor>             - Delete vendor offer',
          '',
          '  Fields: discount | minDistance | maxDistance | minWeight | maxWeight',
          '',
        );
      }
      if (isAdmin) {
        lines.push(
          '  Notifications:',
          '  notifications                                      - View sent notifications',
          '',
        );
      }
      lines.push('  clear                                              - Clear terminal');
      return { type: 'help', success: true, message: lines.join('\n') };
    }

    // ── Notifications ──
    if (cmd === 'notifications') {
      if (!isAdmin) {
        return { type: 'error', success: false, message: 'Permission denied: Only super_admin can view notifications' };
      }
      return {
        type: 'notification-list',
        success: true,
        message: session.notifications.length === 0
          ? 'No notifications sent yet.'
          : session.notifications.map(n =>
            `[${n.timestamp}] To: ${n.to} | ${n.subject}\n  ${n.body}`
          ).join('\n\n'),
        data: session.notifications,
      };
    }

    // ── Login As Vendor: loginas:<vendor> ──
    if (cmd?.startsWith('loginas')) {
      if (!isAdmin) {
        return { type: 'error', success: false, message: 'Permission denied: Only super_admin can login as vendor' };
      }
      // Parse loginas:<vendor> format
      const colonIdx = cmd.indexOf(':');
      const vendorUsername = colonIdx !== -1 ? cmd.slice(colonIdx + 1) : parts[1];
      if (!vendorUsername) {
        return { type: 'error', success: false, message: 'Usage: loginas:<vendor_username>' };
      }
      const vendor = session.users.find(u => u.username.toLowerCase() === vendorUsername.toLowerCase());
      if (!vendor) {
        return { type: 'error', success: false, message: `Vendor "${vendorUsername}" not found` };
      }
      if (vendor.role !== 'vendor') {
        return { type: 'error', success: false, message: `"${vendorUsername}" is not a vendor account` };
      }
      setSession(prev => ({
        ...prev,
        originalAdmin: prev.currentUser,
        currentUser: { username: vendor.username, role: vendor.role },
      }));
      return {
        type: 'login-as',
        success: true,
        message: `Now acting as vendor "${vendor.username}". Use the back button or logout to return to admin.`,
      };
    }

    // ── User Commands ──
    if (cmd === 'user') {
      if (role === 'guest') {
        return { type: 'error', success: false, message: 'Permission denied: Guest users cannot manage users' };
      }
      if (role === 'vendor') {
        return { type: 'error', success: false, message: 'Permission denied: Only super_admin can manage users' };
      }

      const action = parts[1]?.toLowerCase() || '';

      // user list
      if (action === 'list') {
        const vendors = session.users.filter(u => u.role === 'vendor');
        if (vendors.length === 0) {
          return { type: 'user-list', success: true, message: 'No registered vendors.', data: [] };
        }
        return {
          type: 'user-list',
          success: true,
          message: vendors.map(u =>
            `${u.username} | ${u.email || '(no email)'} | ${u.createdAt}`
          ).join('\n'),
          data: vendors,
        };
      }

      // user add:<username> <email>
      if (action.startsWith('add:')) {
        const uname = action.slice(4); // everything after "add:"
        const email = parts[2];
        if (!uname || !email) {
          return { type: 'error', success: false, message: 'Usage: user add:<username> <email>' };
        }
        if (!email.includes('@') || !email.includes('.')) {
          return { type: 'error', success: false, message: `Invalid email "${email}". Must contain @ and .` };
        }
        if (session.users.some(u => u.username.toLowerCase() === uname.toLowerCase())) {
          return { type: 'error', success: false, message: `User "${uname}" already exists` };
        }
        const newUser: User = {
          username: uname,
          passwordHash: '', // No password — vendor sets their own via register/login
          role: 'vendor',
          email: email,
          createdAt: new Date().toISOString().split('T')[0],
        };
        const notif = createNotification(
          email,
          'Welcome to Courier Service App',
          `Your vendor account has been created.\nUsername: ${uname}\nPlease register with your own password to login.`
        );
        setSession(prev => ({
          ...prev,
          users: [...prev.users, newUser],
          notifications: [...prev.notifications, notif],
        }));
        return {
          type: 'user-add',
          success: true,
          message: `Vendor "${uname}" created.\nEmail notification sent to ${email}.`,
          data: newUser,
        };
      }

      // user edit:email:<username> <new_email>
      if (action.startsWith('edit:email:')) {
        const uname = action.slice(11); // everything after "edit:email:"
        const newEmail = parts[2];
        if (!uname || !newEmail) {
          return { type: 'error', success: false, message: 'Usage: user edit:email:<username> <new_email>' };
        }
        if (!newEmail.includes('@') || !newEmail.includes('.')) {
          return { type: 'error', success: false, message: `Invalid email "${newEmail}". Must contain @ and .` };
        }
        const userIdx = session.users.findIndex(u => u.username.toLowerCase() === uname.toLowerCase());
        if (userIdx === -1) {
          return { type: 'error', success: false, message: `User "${uname}" not found` };
        }
        const targetUser = session.users[userIdx];
        if (targetUser.role === 'super_admin') {
          return { type: 'error', success: false, message: 'Cannot edit super_admin account' };
        }
        if (targetUser.role !== 'vendor') {
          return { type: 'error', success: false, message: `"${uname}" is not a vendor account` };
        }

        const updated = { ...targetUser, email: newEmail };
        const notifications: Notification[] = [];
        const notif = createNotification(
          newEmail,
          'Account Updated - Courier Service App',
          `Your account "${uname}" email has been updated by admin.\nNew email: ${newEmail}`
        );
        notifications.push(notif);

        setSession(prev => {
          const newUsers = [...prev.users];
          newUsers[userIdx] = updated;
          return { ...prev, users: newUsers, notifications: [...prev.notifications, ...notifications] };
        });
        return {
          type: 'user-edit',
          success: true,
          message: `Vendor "${uname}" updated: email changed to ${newEmail}\nEmail notification sent to ${newEmail}.`,
          data: updated,
        };
      }

      // user delete:<username>
      if (action.startsWith('delete:')) {
        const uname = action.slice(7); // everything after "delete:"
        if (!uname) {
          return { type: 'error', success: false, message: 'Usage: user delete:<username>' };
        }
        const target = session.users.find(u => u.username.toLowerCase() === uname.toLowerCase());
        if (!target) {
          return { type: 'error', success: false, message: `User "${uname}" not found` };
        }
        if (target.role === 'super_admin') {
          return { type: 'error', success: false, message: 'Cannot delete super_admin account' };
        }
        if (target.role !== 'vendor') {
          return { type: 'error', success: false, message: `"${uname}" is not a vendor account` };
        }

        const notifications: Notification[] = [];
        if (target.email) {
          notifications.push(createNotification(
            target.email,
            'Account Removed - Courier Service App',
            `Your vendor account "${uname}" has been removed by admin.`
          ));
        }

        setSession(prev => ({
          ...prev,
          users: prev.users.filter(u => u.username.toLowerCase() !== uname.toLowerCase()),
          notifications: [...prev.notifications, ...notifications],
        }));
        return {
          type: 'user-delete',
          success: true,
          message: `Vendor "${uname}" deleted.${target.email ? ` Notification sent to ${target.email}.` : ''}`,
        };
      }

      return { type: 'error', success: false, message: `Unknown user action "${action}". Try: list | add:<name> | edit:email:<name> | delete:<name>` };
    }

    // ── Offer Commands ──
    if (cmd === 'offer') {
      if (role === 'guest') {
        return { type: 'error', success: false, message: 'Permission denied: Guest users cannot manage offers' };
      }

      const action = parts[1]?.toLowerCase() || '';
      const { vendor: toOnlyVendor, remaining: flaglessParts } = parseToOnlyFlag(parts.slice(1));

      // Validate --to-only vendor exists (admin only)
      if (toOnlyVendor) {
        if (!isAdmin) {
          return { type: 'error', success: false, message: 'Permission denied: Only super_admin can use --to-only flag' };
        }
        const vendorExists = session.users.some(u => u.username.toLowerCase() === toOnlyVendor.toLowerCase() && u.role === 'vendor');
        if (!vendorExists) {
          return { type: 'error', success: false, message: `Vendor "${toOnlyVendor}" not found` };
        }
      }

      // offer list / offer list --to-only:<vendor>
      if (action === 'list' || action?.startsWith('list')) {
        let filtered = session.offers;
        if (toOnlyVendor) {
          filtered = session.offers.filter(o => o.vendor?.toLowerCase() === toOnlyVendor.toLowerCase());
        } else if (role === 'vendor') {
          const currentVendor = session.currentUser?.username?.toLowerCase();
          filtered = session.offers.filter(o => !o.vendor || o.vendor.toLowerCase() === currentVendor);
        }
        if (filtered.length === 0) {
          return { type: 'offer-list', success: true, message: toOnlyVendor ? `No offers for vendor "${toOnlyVendor}".` : 'No offers found.', data: [] };
        }
        return {
          type: 'offer-list',
          success: true,
          message: filtered.map(o =>
            `${o.code} | ${o.discount}% | dist: ${o.minDistance}-${o.maxDistance}km | weight: ${o.minWeight}-${o.maxWeight}kg${o.vendor ? ` | vendor: ${o.vendor}` : ' | global'}`
          ).join('\n'),
          data: filtered,
        };
      }

      // offer --add-to-only:<vendor> <code> <disc> <minD> <maxD> <minW> <maxW>
      // offer add <code> <disc> <minD> <maxD> <minW> <maxW>
      if (action === 'add' || action?.startsWith('--add-to-only:')) {
        let targetVendor: string | null = null;
        let argParts: string[];

        if (action.startsWith('--add-to-only:')) {
          targetVendor = action.slice(14); // after "--add-to-only:"
          argParts = parts.slice(2);
          // Validate vendor
          if (!isAdmin) {
            return { type: 'error', success: false, message: 'Permission denied: Only super_admin can use --add-to-only' };
          }
          const vendorExists = session.users.some(u => u.username.toLowerCase() === targetVendor!.toLowerCase() && u.role === 'vendor');
          if (!vendorExists) {
            return { type: 'error', success: false, message: `Vendor "${targetVendor}" not found` };
          }
        } else {
          argParts = parts.slice(2);
        }

        const [code, disc, minD, maxD, minW, maxW] = argParts;
        if (!code || !disc || !minD || !maxD || !minW || !maxW) {
          return { type: 'error', success: false, message: targetVendor
            ? `Usage: offer --add-to-only:<vendor> <code> <discount> <minDist> <maxDist> <minWeight> <maxWeight>`
            : 'Usage: offer add <code> <discount> <minDist> <maxDist> <minWeight> <maxWeight>' };
        }
        const normalizedCode = code.toUpperCase();
        // Check for duplicate in same scope (global or same vendor)
        const duplicate = session.offers.find(o => o.code === normalizedCode && (targetVendor ? o.vendor?.toLowerCase() === targetVendor.toLowerCase() : !o.vendor));
        if (duplicate) {
          return { type: 'error', success: false, message: `Offer "${normalizedCode}" already exists${targetVendor ? ` for vendor "${targetVendor}"` : ''}` };
        }
        const newOffer: OfferCriteria = {
          code: normalizedCode,
          discount: Number(disc),
          minDistance: Number(minD),
          maxDistance: Number(maxD),
          minWeight: Number(minW),
          maxWeight: Number(maxW),
          ...(targetVendor ? { vendor: targetVendor } : {}),
        };
        if ([newOffer.discount, newOffer.minDistance, newOffer.maxDistance, newOffer.minWeight, newOffer.maxWeight].some(isNaN)) {
          return { type: 'error', success: false, message: 'All numeric fields must be valid numbers' };
        }

        const notifications: Notification[] = [];
        if (isAdmin) {
          const now = new Date();
          const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
          if (targetVendor) {
            const v = session.users.find(u => u.username.toLowerCase() === targetVendor.toLowerCase() && u.email);
            if (v?.email) {
              notifications.push(createNotification(
                v.email,
                `Offer Code Added - ${dateStr}`,
                `Admin added offer "${normalizedCode}" for you: ${newOffer.discount}% discount, dist ${newOffer.minDistance}-${newOffer.maxDistance}km, weight ${newOffer.minWeight}-${newOffer.maxWeight}kg`
              ));
            }
          } else {
            const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
            for (const v of vendors) {
              notifications.push(createNotification(
                v.email!,
                `Offer Code Added - ${dateStr}`,
                `Admin added global offer "${normalizedCode}": ${newOffer.discount}% discount, dist ${newOffer.minDistance}-${newOffer.maxDistance}km, weight ${newOffer.minWeight}-${newOffer.maxWeight}kg`
              ));
            }
          }
        }

        setSession(prev => ({
          ...prev,
          offers: [...prev.offers, newOffer],
          notifications: [...prev.notifications, ...notifications],
        }));
        return {
          type: 'offer-add',
          success: true,
          message: `Offer "${normalizedCode}" added${targetVendor ? ` for vendor "${targetVendor}"` : ' (global)'}: ${newOffer.discount}% discount, dist ${newOffer.minDistance}-${newOffer.maxDistance}km, weight ${newOffer.minWeight}-${newOffer.maxWeight}kg${notifications.length > 0 ? `\n${notifications.length} vendor(s) notified.` : ''}`,
          data: newOffer,
        };
      }

      // offer edit:code [--to-only:<vendor>] <old>:<new>
      if (action === 'edit:code') {
        // Find the code pair (skip any --to-only flags)
        const { vendor: editVendor, remaining: editParts } = parseToOnlyFlag(parts.slice(2));
        const codePair = editParts[0];
        if (!codePair || !codePair.includes(':')) {
          return { type: 'error', success: false, message: 'Usage: offer edit:code [--to-only:<vendor>] <old_code>:<new_code>' };
        }
        const colonIdx = codePair.indexOf(':');
        const oldCode = codePair.slice(0, colonIdx).toUpperCase();
        const newCode = codePair.slice(colonIdx + 1).toUpperCase();
        if (!oldCode || !newCode) {
          return { type: 'error', success: false, message: 'Usage: offer edit:code [--to-only:<vendor>] <old_code>:<new_code>' };
        }

        // Find the offer in the correct scope
        const offerIdx = session.offers.findIndex(o =>
          o.code === oldCode && (editVendor ? o.vendor?.toLowerCase() === editVendor.toLowerCase() : true)
        );
        if (offerIdx === -1) {
          return { type: 'error', success: false, message: `Offer "${oldCode}" not found${editVendor ? ` for vendor "${editVendor}"` : ''}` };
        }
        if (session.offers.some(o => o.code === newCode && (editVendor ? o.vendor?.toLowerCase() === editVendor.toLowerCase() : true))) {
          return { type: 'error', success: false, message: `Offer "${newCode}" already exists` };
        }

        const notifications: Notification[] = [];
        if (isAdmin) {
          const now = new Date();
          const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
          if (editVendor) {
            const v = session.users.find(u => u.username.toLowerCase() === editVendor.toLowerCase() && u.email);
            if (v?.email) {
              notifications.push(createNotification(
                v.email,
                `Offer Code Renamed - ${dateStr}`,
                `Admin renamed your offer "${oldCode}" to "${newCode}"`
              ));
            }
          } else {
            const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
            for (const v of vendors) {
              notifications.push(createNotification(
                v.email!,
                `Offer Code Renamed - ${dateStr}`,
                `Admin renamed offer "${oldCode}" to "${newCode}"`
              ));
            }
          }
        }

        setSession(prev => {
          const newOffers = [...prev.offers];
          newOffers[offerIdx] = { ...newOffers[offerIdx], code: newCode };
          return { ...prev, offers: newOffers, notifications: [...prev.notifications, ...notifications] };
        });
        return {
          type: 'offer-edit',
          success: true,
          message: `Offer "${oldCode}" renamed to "${newCode}"${editVendor ? ` (vendor: ${editVendor})` : ''}${notifications.length > 0 ? `\n${notifications.length} vendor(s) notified.` : ''}`,
        };
      }

      // offer edit:<field> [--to-only:<vendor>] <code> <value>
      // Fields: discount, minDistance, maxDistance, minWeight, maxWeight
      const editableFields = ['discount', 'mindistance', 'maxdistance', 'minweight', 'maxweight'];
      const editFieldMatch = action?.match(/^edit:(.+)$/);
      if (editFieldMatch) {
        const fieldRaw = editFieldMatch[1].toLowerCase();
        // Map to proper casing
        const fieldMap: Record<string, string> = {
          discount: 'discount',
          mindistance: 'minDistance',
          maxdistance: 'maxDistance',
          minweight: 'minWeight',
          maxweight: 'maxWeight',
        };
        if (!editableFields.includes(fieldRaw)) {
          return { type: 'error', success: false, message: `Unknown field "${editFieldMatch[1]}". Editable: discount | minDistance | maxDistance | minWeight | maxWeight` };
        }
        const field = fieldMap[fieldRaw];
        const { vendor: editVendor, remaining: editParts } = parseToOnlyFlag(parts.slice(2));
        const code = editParts[0];
        const value = editParts[1];
        if (!code || !value) {
          return { type: 'error', success: false, message: `Usage: offer edit:${field} [--to-only:<vendor>] <code> <value>` };
        }
        const normalizedCode = code.toUpperCase();
        const offerIdx = session.offers.findIndex(o =>
          o.code === normalizedCode && (editVendor ? o.vendor?.toLowerCase() === editVendor.toLowerCase() : true)
        );
        if (offerIdx === -1) {
          return { type: 'error', success: false, message: `Offer "${normalizedCode}" not found${editVendor ? ` for vendor "${editVendor}"` : ''}` };
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { type: 'error', success: false, message: 'Value must be a number' };
        }

        const notifications: Notification[] = [];
        if (isAdmin) {
          const now = new Date();
          const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
          if (editVendor) {
            const v = session.users.find(u => u.username.toLowerCase() === editVendor.toLowerCase() && u.email);
            if (v?.email) {
              notifications.push(createNotification(
                v.email,
                `Offer Code Updated - ${dateStr}`,
                `Admin updated your offer "${normalizedCode}": ${field} changed to ${numValue}`
              ));
            }
          } else {
            const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
            for (const v of vendors) {
              notifications.push(createNotification(
                v.email!,
                `Offer Code Updated - ${dateStr}`,
                `Admin updated offer "${normalizedCode}": ${field} changed to ${numValue}`
              ));
            }
          }
        }

        setSession(prev => {
          const newOffers = [...prev.offers];
          newOffers[offerIdx] = { ...newOffers[offerIdx], [field]: numValue };
          return { ...prev, offers: newOffers, notifications: [...prev.notifications, ...notifications] };
        });
        return {
          type: 'offer-edit',
          success: true,
          message: `Offer "${normalizedCode}" updated: ${field} → ${numValue}${editVendor ? ` (vendor: ${editVendor})` : ''}${notifications.length > 0 ? `\n${notifications.length} vendor(s) notified.` : ''}`,
        };
      }

      // offer delete:<code> [--to-only:<vendor>]
      if (action?.startsWith('delete:')) {
        const codeFromAction = action.slice(7).toUpperCase(); // after "delete:"
        if (!codeFromAction) {
          return { type: 'error', success: false, message: 'Usage: offer delete:<code> [--to-only:<vendor>]' };
        }
        const { vendor: delVendor } = parseToOnlyFlag(parts.slice(2));

        const offerIdx = session.offers.findIndex(o =>
          o.code === codeFromAction && (delVendor ? o.vendor?.toLowerCase() === delVendor.toLowerCase() : true)
        );
        if (offerIdx === -1) {
          return { type: 'error', success: false, message: `Offer "${codeFromAction}" not found${delVendor ? ` for vendor "${delVendor}"` : ''}` };
        }

        const notifications: Notification[] = [];
        if (isAdmin) {
          const now = new Date();
          const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
          if (delVendor) {
            const v = session.users.find(u => u.username.toLowerCase() === delVendor.toLowerCase() && u.email);
            if (v?.email) {
              notifications.push(createNotification(
                v.email,
                `Offer Code Removed - ${dateStr}`,
                `Admin removed your offer "${codeFromAction}"`
              ));
            }
          } else {
            const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
            for (const v of vendors) {
              notifications.push(createNotification(
                v.email!,
                `Offer Code Removed - ${dateStr}`,
                `Admin removed offer "${codeFromAction}"`
              ));
            }
          }
        }

        setSession(prev => ({
          ...prev,
          offers: prev.offers.filter((_, i) => i !== offerIdx),
          notifications: [...prev.notifications, ...notifications],
        }));
        return {
          type: 'offer-delete',
          success: true,
          message: `Offer "${codeFromAction}" deleted.${delVendor ? ` (vendor: ${delVendor})` : ''}${notifications.length > 0 ? ` ${notifications.length} vendor(s) notified.` : ''}`,
        };
      }

      return { type: 'error', success: false, message: `Unknown offer action "${action}". Try: list | add | --add-to-only:<vendor> | edit:<field> | edit:code | delete:<code>` };
    }

    return null;
  }, [session]);

  return (
    <SessionContext.Provider value={{
      session,
      login,
      register,
      loginAsGuest,
      logout,
      updateEmail,
      processAdminCommand,
      getOffersForCalculation,
      isActingAsVendor,
      backToAdmin,
    }}>
      {children}
    </SessionContext.Provider>
  );
}