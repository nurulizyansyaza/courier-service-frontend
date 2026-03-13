import type {
  UserRole, User, SessionOffer, SessionState, AdminResult,
  CalcOfferCriteria, Notification,
} from './types';
import { simpleHash, createNotification } from './constants';

// ── Pure Session Mutations ─────────────────────────────────────────────
// Each function takes current SessionState + args and returns a new
// SessionState plus any result data.  No React, no side-effects.

// ── Login ──────────────────────────────────────────────────────────────

export function loginUser(
  session: SessionState,
  username: string,
  password: string,
): { session: SessionState; success: boolean; error?: string } {
  const user = session.users.find(
    u => u.username.toLowerCase() === username.toLowerCase(),
  );
  if (!user) {
    return { session, success: false, error: 'User not found' };
  }
  if (user.passwordHash && user.passwordHash !== simpleHash(password)) {
    return { session, success: false, error: 'Invalid password' };
  }
  return {
    session: {
      ...session,
      currentUser: { username: user.username, role: user.role },
      originalAdmin: null,
    },
    success: true,
  };
}

// ── Register ───────────────────────────────────────────────────────────

export function registerUser(
  session: SessionState,
  username: string,
  password: string,
): { session: SessionState; success: boolean; error?: string } {
  if (session.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    // User exists — try updating password for passwordless accounts
    const existing = session.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing && !existing.passwordHash) {
      const updatedUsers = session.users.map(u =>
        u.username.toLowerCase() === username.toLowerCase()
          ? { ...u, passwordHash: simpleHash(password) }
          : u,
      );
      return {
        session: {
          ...session,
          users: updatedUsers,
          currentUser: { username: existing.username, role: existing.role },
        },
        success: true,
      };
    }
    return { session, success: false, error: `Username "${username}" already taken` };
  }
  const newUser: User = {
    username,
    passwordHash: simpleHash(password),
    role: 'vendor' as UserRole,
    createdAt: new Date().toISOString().split('T')[0],
  };
  return {
    session: {
      ...session,
      users: [...session.users, newUser],
      currentUser: { username, role: 'vendor' },
    },
    success: true,
  };
}

// ── Login as Guest ─────────────────────────────────────────────────────

export function loginAsGuest(session: SessionState): SessionState {
  return { ...session, currentUser: { username: 'guest', role: 'guest' } };
}

// ── Logout ─────────────────────────────────────────────────────────────

export function logoutUser(session: SessionState): SessionState {
  return { ...session, currentUser: null, originalAdmin: null };
}

// ── Update Email ───────────────────────────────────────────────────────

export function updateUserEmail(
  session: SessionState,
  email: string,
): { session: SessionState; success: boolean; error?: string } {
  if (!email.includes('@') || !email.includes('.')) {
    return { session, success: false, error: 'Invalid email format' };
  }
  if (!session.currentUser) {
    return { session, success: false, error: 'Not logged in' };
  }
  const updatedUsers = session.users.map(u =>
    u.username === session.currentUser!.username ? { ...u, email } : u,
  );
  return { session: { ...session, users: updatedUsers }, success: true };
}

// ── Is Acting as Vendor ────────────────────────────────────────────────

export function isActingAsVendor(session: SessionState): boolean {
  return session.originalAdmin !== null;
}

// ── Back to Admin ──────────────────────────────────────────────────────

export function backToAdmin(session: SessionState): SessionState {
  if (!session.originalAdmin) return session;
  return {
    ...session,
    currentUser: session.originalAdmin,
    originalAdmin: null,
  };
}

// ── Get Offers for Calculation ─────────────────────────────────────────

export function getOffersForCalculation(
  session: SessionState,
): Record<string, CalcOfferCriteria> {
  const currentUsername = session.currentUser?.username;
  const currentRole = session.currentUser?.role;
  const record: Record<string, CalcOfferCriteria> = {};
  for (const o of session.offers) {
    if (
      !o.vendor ||
      currentRole === 'super_admin' ||
      (o.vendor && o.vendor.toLowerCase() === currentUsername?.toLowerCase())
    ) {
      record[o.code] = {
        discount: o.discount,
        minDistance: o.minDistance,
        maxDistance: o.maxDistance,
        minWeight: o.minWeight,
        maxWeight: o.maxWeight,
      };
    }
  }
  return record;
}

// ── Parse --to-only flag ───────────────────────────────────────────────

export function parseToOnlyFlag(
  parts: string[],
): { vendor: string | null; remaining: string[] } {
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
}

// ── Process Admin Command ──────────────────────────────────────────────

export function processAdminCommand(
  session: SessionState,
  input: string,
): { session: SessionState; result: AdminResult | null } {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const role = session.currentUser?.role;
  const isAdmin = role === 'super_admin';

  const handledCmds = ['user', 'offer', 'help', 'loginas', 'notifications'];
  if (!handledCmds.some(c => cmd === c || cmd?.startsWith(c + ':'))) {
    return { session, result: null };
  }

  // ── Help ──
  if (cmd === 'help') {
    const lines = ['Available commands:', ''];
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
    return { session, result: { type: 'help', success: true, message: lines.join('\n') } };
  }

  // ── Notifications ──
  if (cmd === 'notifications') {
    if (!isAdmin) {
      return { session, result: { type: 'error', success: false, message: 'Permission denied: Only super_admin can view notifications' } };
    }
    return {
      session,
      result: {
        type: 'notification-list',
        success: true,
        message: session.notifications.length === 0
          ? 'No notifications sent yet.'
          : session.notifications.map(n =>
            `[${n.timestamp}] To: ${n.to} | ${n.subject}\n  ${n.body}`,
          ).join('\n\n'),
        data: session.notifications,
      },
    };
  }

  // ── Login As Vendor: loginas:<vendor> ──
  if (cmd?.startsWith('loginas')) {
    if (!isAdmin) {
      return { session, result: { type: 'error', success: false, message: 'Permission denied: Only super_admin can login as vendor' } };
    }
    const colonIdx = cmd.indexOf(':');
    const vendorUsername = colonIdx !== -1 ? cmd.slice(colonIdx + 1) : parts[1];
    if (!vendorUsername) {
      return { session, result: { type: 'error', success: false, message: 'Usage: loginas:<vendor_username>' } };
    }
    const vendor = session.users.find(u => u.username.toLowerCase() === vendorUsername.toLowerCase());
    if (!vendor) {
      return { session, result: { type: 'error', success: false, message: `Vendor "${vendorUsername}" not found` } };
    }
    if (vendor.role !== 'vendor') {
      return { session, result: { type: 'error', success: false, message: `"${vendorUsername}" is not a vendor account` } };
    }
    return {
      session: {
        ...session,
        originalAdmin: session.currentUser,
        currentUser: { username: vendor.username, role: vendor.role },
      },
      result: {
        type: 'login-as',
        success: true,
        message: `Now acting as vendor "${vendor.username}". Use the back button or logout to return to admin.`,
      },
    };
  }

  // ── User Commands ──
  if (cmd === 'user') {
    if (role === 'guest') {
      return { session, result: { type: 'error', success: false, message: 'Permission denied: Guest users cannot manage users' } };
    }
    if (role === 'vendor') {
      return { session, result: { type: 'error', success: false, message: 'Permission denied: Only super_admin can manage users' } };
    }

    const action = parts[1]?.toLowerCase() || '';

    // user list
    if (action === 'list') {
      const vendors = session.users.filter(u => u.role === 'vendor');
      if (vendors.length === 0) {
        return { session, result: { type: 'user-list', success: true, message: 'No registered vendors.', data: [] } };
      }
      return {
        session,
        result: {
          type: 'user-list',
          success: true,
          message: vendors.map(u =>
            `${u.username} | ${u.email || '(no email)'} | ${u.createdAt}`,
          ).join('\n'),
          data: vendors,
        },
      };
    }

    // user add:<username> <email>
    if (action.startsWith('add:')) {
      const uname = action.slice(4);
      const email = parts[2];
      if (!uname || !email) {
        return { session, result: { type: 'error', success: false, message: 'Usage: user add:<username> <email>' } };
      }
      if (!email.includes('@') || !email.includes('.')) {
        return { session, result: { type: 'error', success: false, message: `Invalid email "${email}". Must contain @ and .` } };
      }
      if (session.users.some(u => u.username.toLowerCase() === uname.toLowerCase())) {
        return { session, result: { type: 'error', success: false, message: `User "${uname}" already exists` } };
      }
      const newUser: User = {
        username: uname,
        passwordHash: '',
        role: 'vendor',
        email,
        createdAt: new Date().toISOString().split('T')[0],
      };
      const notif = createNotification(
        email,
        'Welcome to Courier Service App',
        `Your vendor account has been created.\nUsername: ${uname}\nPlease register with your own password to login.`,
      );
      return {
        session: {
          ...session,
          users: [...session.users, newUser],
          notifications: [...session.notifications, notif],
        },
        result: {
          type: 'user-add',
          success: true,
          message: `Vendor "${uname}" created.\nEmail notification sent to ${email}.`,
          data: newUser,
        },
      };
    }

    // user edit:email:<username> <new_email>
    if (action.startsWith('edit:email:')) {
      const uname = action.slice(11);
      const newEmail = parts[2];
      if (!uname || !newEmail) {
        return { session, result: { type: 'error', success: false, message: 'Usage: user edit:email:<username> <new_email>' } };
      }
      if (!newEmail.includes('@') || !newEmail.includes('.')) {
        return { session, result: { type: 'error', success: false, message: `Invalid email "${newEmail}". Must contain @ and .` } };
      }
      const userIdx = session.users.findIndex(u => u.username.toLowerCase() === uname.toLowerCase());
      if (userIdx === -1) {
        return { session, result: { type: 'error', success: false, message: `User "${uname}" not found` } };
      }
      const targetUser = session.users[userIdx];
      if (targetUser.role === 'super_admin') {
        return { session, result: { type: 'error', success: false, message: 'Cannot edit super_admin account' } };
      }
      if (targetUser.role !== 'vendor') {
        return { session, result: { type: 'error', success: false, message: `"${uname}" is not a vendor account` } };
      }

      const updated = { ...targetUser, email: newEmail };
      const notif = createNotification(
        newEmail,
        'Account Updated - Courier Service App',
        `Your account "${uname}" email has been updated by admin.\nNew email: ${newEmail}`,
      );
      const newUsers = [...session.users];
      newUsers[userIdx] = updated;
      return {
        session: {
          ...session,
          users: newUsers,
          notifications: [...session.notifications, notif],
        },
        result: {
          type: 'user-edit',
          success: true,
          message: `Vendor "${uname}" updated: email changed to ${newEmail}\nEmail notification sent to ${newEmail}.`,
          data: updated,
        },
      };
    }

    // user delete:<username>
    if (action.startsWith('delete:')) {
      const uname = action.slice(7);
      if (!uname) {
        return { session, result: { type: 'error', success: false, message: 'Usage: user delete:<username>' } };
      }
      const target = session.users.find(u => u.username.toLowerCase() === uname.toLowerCase());
      if (!target) {
        return { session, result: { type: 'error', success: false, message: `User "${uname}" not found` } };
      }
      if (target.role === 'super_admin') {
        return { session, result: { type: 'error', success: false, message: 'Cannot delete super_admin account' } };
      }
      if (target.role !== 'vendor') {
        return { session, result: { type: 'error', success: false, message: `"${uname}" is not a vendor account` } };
      }

      const notifications: Notification[] = [];
      if (target.email) {
        notifications.push(createNotification(
          target.email,
          'Account Removed - Courier Service App',
          `Your vendor account "${uname}" has been removed by admin.`,
        ));
      }

      return {
        session: {
          ...session,
          users: session.users.filter(u => u.username.toLowerCase() !== uname.toLowerCase()),
          notifications: [...session.notifications, ...notifications],
        },
        result: {
          type: 'user-delete',
          success: true,
          message: `Vendor "${uname}" deleted.${target.email ? ` Notification sent to ${target.email}.` : ''}`,
        },
      };
    }

    return { session, result: { type: 'error', success: false, message: `Unknown user action "${action}". Try: list | add:<name> | edit:email:<name> | delete:<name>` } };
  }

  // ── Offer Commands ──
  if (cmd === 'offer') {
    if (role === 'guest') {
      return { session, result: { type: 'error', success: false, message: 'Permission denied: Guest users cannot manage offers' } };
    }

    const action = parts[1]?.toLowerCase() || '';
    const { vendor: toOnlyVendor, remaining: flaglessParts } = parseToOnlyFlag(parts.slice(1));

    // Validate --to-only vendor exists (admin only)
    if (toOnlyVendor) {
      if (!isAdmin) {
        return { session, result: { type: 'error', success: false, message: 'Permission denied: Only super_admin can use --to-only flag' } };
      }
      const vendorExists = session.users.some(u => u.username.toLowerCase() === toOnlyVendor.toLowerCase() && u.role === 'vendor');
      if (!vendorExists) {
        return { session, result: { type: 'error', success: false, message: `Vendor "${toOnlyVendor}" not found` } };
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
        return {
          session,
          result: { type: 'offer-list', success: true, message: toOnlyVendor ? `No offers for vendor "${toOnlyVendor}".` : 'No offers found.', data: [] },
        };
      }
      return {
        session,
        result: {
          type: 'offer-list',
          success: true,
          message: filtered.map(o =>
            `${o.code} | ${o.discount}% | dist: ${o.minDistance}-${o.maxDistance}km | weight: ${o.minWeight}-${o.maxWeight}kg${o.vendor ? ` | vendor: ${o.vendor}` : ' | global'}`,
          ).join('\n'),
          data: filtered,
        },
      };
    }

    // offer add / offer --add-to-only:<vendor>
    if (action === 'add' || action?.startsWith('--add-to-only:')) {
      let targetVendor: string | null = null;
      let argParts: string[];

      if (action.startsWith('--add-to-only:')) {
        targetVendor = action.slice(14);
        argParts = parts.slice(2);
        if (!isAdmin) {
          return { session, result: { type: 'error', success: false, message: 'Permission denied: Only super_admin can use --add-to-only' } };
        }
        const vendorExists = session.users.some(u => u.username.toLowerCase() === targetVendor!.toLowerCase() && u.role === 'vendor');
        if (!vendorExists) {
          return { session, result: { type: 'error', success: false, message: `Vendor "${targetVendor}" not found` } };
        }
      } else {
        argParts = parts.slice(2);
      }

      const [code, disc, minD, maxD, minW, maxW] = argParts;
      if (!code || !disc || !minD || !maxD || !minW || !maxW) {
        return {
          session,
          result: {
            type: 'error', success: false,
            message: targetVendor
              ? `Usage: offer --add-to-only:<vendor> <code> <discount> <minDist> <maxDist> <minWeight> <maxWeight>`
              : 'Usage: offer add <code> <discount> <minDist> <maxDist> <minWeight> <maxWeight>',
          },
        };
      }
      const normalizedCode = code.toUpperCase();
      const duplicate = session.offers.find(o => o.code === normalizedCode && (targetVendor ? o.vendor?.toLowerCase() === targetVendor.toLowerCase() : !o.vendor));
      if (duplicate) {
        return { session, result: { type: 'error', success: false, message: `Offer "${normalizedCode}" already exists${targetVendor ? ` for vendor "${targetVendor}"` : ''}` } };
      }
      const newOffer: SessionOffer = {
        code: normalizedCode,
        discount: Number(disc),
        minDistance: Number(minD),
        maxDistance: Number(maxD),
        minWeight: Number(minW),
        maxWeight: Number(maxW),
        ...(targetVendor ? { vendor: targetVendor } : {}),
      };
      if ([newOffer.discount, newOffer.minDistance, newOffer.maxDistance, newOffer.minWeight, newOffer.maxWeight].some(isNaN)) {
        return { session, result: { type: 'error', success: false, message: 'All numeric fields must be valid numbers' } };
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
              `Admin added offer "${normalizedCode}" for you: ${newOffer.discount}% discount, dist ${newOffer.minDistance}-${newOffer.maxDistance}km, weight ${newOffer.minWeight}-${newOffer.maxWeight}kg`,
            ));
          }
        } else {
          const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
          for (const v of vendors) {
            notifications.push(createNotification(
              v.email!,
              `Offer Code Added - ${dateStr}`,
              `Admin added global offer "${normalizedCode}": ${newOffer.discount}% discount, dist ${newOffer.minDistance}-${newOffer.maxDistance}km, weight ${newOffer.minWeight}-${newOffer.maxWeight}kg`,
            ));
          }
        }
      }

      return {
        session: {
          ...session,
          offers: [...session.offers, newOffer],
          notifications: [...session.notifications, ...notifications],
        },
        result: {
          type: 'offer-add',
          success: true,
          message: `Offer "${normalizedCode}" added${targetVendor ? ` for vendor "${targetVendor}"` : ' (global)'}: ${newOffer.discount}% discount, dist ${newOffer.minDistance}-${newOffer.maxDistance}km, weight ${newOffer.minWeight}-${newOffer.maxWeight}kg${notifications.length > 0 ? `\n${notifications.length} vendor(s) notified.` : ''}`,
          data: newOffer,
        },
      };
    }

    // offer edit:code [--to-only:<vendor>] <old>:<new>
    if (action === 'edit:code') {
      const { vendor: editVendor, remaining: editParts } = parseToOnlyFlag(parts.slice(2));
      const codePair = editParts[0];
      if (!codePair || !codePair.includes(':')) {
        return { session, result: { type: 'error', success: false, message: 'Usage: offer edit:code [--to-only:<vendor>] <old_code>:<new_code>' } };
      }
      const colonIdx = codePair.indexOf(':');
      const oldCode = codePair.slice(0, colonIdx).toUpperCase();
      const newCode = codePair.slice(colonIdx + 1).toUpperCase();
      if (!oldCode || !newCode) {
        return { session, result: { type: 'error', success: false, message: 'Usage: offer edit:code [--to-only:<vendor>] <old_code>:<new_code>' } };
      }

      const offerIdx = session.offers.findIndex(o =>
        o.code === oldCode && (editVendor ? o.vendor?.toLowerCase() === editVendor.toLowerCase() : true),
      );
      if (offerIdx === -1) {
        return { session, result: { type: 'error', success: false, message: `Offer "${oldCode}" not found${editVendor ? ` for vendor "${editVendor}"` : ''}` } };
      }
      if (session.offers.some(o => o.code === newCode && (editVendor ? o.vendor?.toLowerCase() === editVendor.toLowerCase() : true))) {
        return { session, result: { type: 'error', success: false, message: `Offer "${newCode}" already exists` } };
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
              `Admin renamed your offer "${oldCode}" to "${newCode}"`,
            ));
          }
        } else {
          const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
          for (const v of vendors) {
            notifications.push(createNotification(
              v.email!,
              `Offer Code Renamed - ${dateStr}`,
              `Admin renamed offer "${oldCode}" to "${newCode}"`,
            ));
          }
        }
      }

      const newOffers = [...session.offers];
      newOffers[offerIdx] = { ...newOffers[offerIdx], code: newCode };
      return {
        session: {
          ...session,
          offers: newOffers,
          notifications: [...session.notifications, ...notifications],
        },
        result: {
          type: 'offer-edit',
          success: true,
          message: `Offer "${oldCode}" renamed to "${newCode}"${editVendor ? ` (vendor: ${editVendor})` : ''}${notifications.length > 0 ? `\n${notifications.length} vendor(s) notified.` : ''}`,
        },
      };
    }

    // offer edit:<field> [--to-only:<vendor>] <code> <value>
    const editableFields = ['discount', 'mindistance', 'maxdistance', 'minweight', 'maxweight'];
    const editFieldMatch = action?.match(/^edit:(.+)$/);
    if (editFieldMatch) {
      const fieldRaw = editFieldMatch[1].toLowerCase();
      const fieldMap: Record<string, string> = {
        discount: 'discount',
        mindistance: 'minDistance',
        maxdistance: 'maxDistance',
        minweight: 'minWeight',
        maxweight: 'maxWeight',
      };
      if (!editableFields.includes(fieldRaw)) {
        return { session, result: { type: 'error', success: false, message: `Unknown field "${editFieldMatch[1]}". Editable: discount | minDistance | maxDistance | minWeight | maxWeight` } };
      }
      const field = fieldMap[fieldRaw];
      const { vendor: editVendor, remaining: editParts } = parseToOnlyFlag(parts.slice(2));
      const code = editParts[0];
      const value = editParts[1];
      if (!code || !value) {
        return { session, result: { type: 'error', success: false, message: `Usage: offer edit:${field} [--to-only:<vendor>] <code> <value>` } };
      }
      const normalizedCode = code.toUpperCase();
      const offerIdx = session.offers.findIndex(o =>
        o.code === normalizedCode && (editVendor ? o.vendor?.toLowerCase() === editVendor.toLowerCase() : true),
      );
      if (offerIdx === -1) {
        return { session, result: { type: 'error', success: false, message: `Offer "${normalizedCode}" not found${editVendor ? ` for vendor "${editVendor}"` : ''}` } };
      }
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return { session, result: { type: 'error', success: false, message: 'Value must be a number' } };
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
              `Admin updated your offer "${normalizedCode}": ${field} changed to ${numValue}`,
            ));
          }
        } else {
          const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
          for (const v of vendors) {
            notifications.push(createNotification(
              v.email!,
              `Offer Code Updated - ${dateStr}`,
              `Admin updated offer "${normalizedCode}": ${field} changed to ${numValue}`,
            ));
          }
        }
      }

      const newOffers = [...session.offers];
      newOffers[offerIdx] = { ...newOffers[offerIdx], [field]: numValue };
      return {
        session: {
          ...session,
          offers: newOffers,
          notifications: [...session.notifications, ...notifications],
        },
        result: {
          type: 'offer-edit',
          success: true,
          message: `Offer "${normalizedCode}" updated: ${field} → ${numValue}${editVendor ? ` (vendor: ${editVendor})` : ''}${notifications.length > 0 ? `\n${notifications.length} vendor(s) notified.` : ''}`,
        },
      };
    }

    // offer delete:<code> [--to-only:<vendor>]
    if (action?.startsWith('delete:')) {
      const codeFromAction = action.slice(7).toUpperCase();
      if (!codeFromAction) {
        return { session, result: { type: 'error', success: false, message: 'Usage: offer delete:<code> [--to-only:<vendor>]' } };
      }
      const { vendor: delVendor } = parseToOnlyFlag(parts.slice(2));

      const offerIdx = session.offers.findIndex(o =>
        o.code === codeFromAction && (delVendor ? o.vendor?.toLowerCase() === delVendor.toLowerCase() : true),
      );
      if (offerIdx === -1) {
        return { session, result: { type: 'error', success: false, message: `Offer "${codeFromAction}" not found${delVendor ? ` for vendor "${delVendor}"` : ''}` } };
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
              `Admin removed your offer "${codeFromAction}"`,
            ));
          }
        } else {
          const vendors = session.users.filter(u => u.role === 'vendor' && u.email);
          for (const v of vendors) {
            notifications.push(createNotification(
              v.email!,
              `Offer Code Removed - ${dateStr}`,
              `Admin removed offer "${codeFromAction}"`,
            ));
          }
        }
      }

      return {
        session: {
          ...session,
          offers: session.offers.filter((_, i) => i !== offerIdx),
          notifications: [...session.notifications, ...notifications],
        },
        result: {
          type: 'offer-delete',
          success: true,
          message: `Offer "${codeFromAction}" deleted.${delVendor ? ` (vendor: ${delVendor})` : ''}${notifications.length > 0 ? ` ${notifications.length} vendor(s) notified.` : ''}`,
        },
      };
    }

    return { session, result: { type: 'error', success: false, message: `Unknown offer action "${action}". Try: list | add | --add-to-only:<vendor> | edit:<field> | edit:code | delete:<code>` } };
  }

  return { session, result: null };
}
