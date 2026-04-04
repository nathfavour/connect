import { Query } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { UsersService } from './users';
import { ecosystemSecurity } from '../ecosystem/security';

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface DiagnosticIssue {
  title: string;
  detail: string;
  severity: DiagnosticSeverity;
}

export interface KeySyncCheck {
  healthy: boolean;
  fixed: boolean;
  issues: DiagnosticIssue[];
  profilePublicKey: string | null;
  livePublicKey: string | null;
}

export interface ConversationDiagnostic {
  healthy: boolean;
  live: boolean;
  partnerUserId: string | null;
  partnerPublicKey: string | null;
  encryptedCount: number;
  decryptedCount: number;
  hasConversationWrap: boolean;
  sampleMessageId: string | null;
  sampleDecryptOk: boolean;
  sampleWrapOk: boolean;
  mockSendOk: boolean;
  probeSummary: string;
  issues: DiagnosticIssue[];
  tips: string[];
}

const PASSWORD_DB = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
const IDENTITIES_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.IDENTITIES;
const KEY_MAPPING_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.KEY_MAPPING;
const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
const PROFILES_TABLE = APPWRITE_CONFIG.TABLES.CHAT.PROFILES;
const CONVERSATIONS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS;
const DIAGNOSTIC_SUPPRESS_KEY = 'kylrix_chat_diagnostics_suppressed_until';

export const isLikelyEncryptedPayload = (value: unknown) => {
  if (typeof value !== 'string') return false;
  return value.length > 40 && !value.includes(' ') && !value.startsWith('http');
};

export function getDiagnosticsSuppressedUntil() {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(DIAGNOSTIC_SUPPRESS_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function suppressDiagnosticsFor(ms = 60_000) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DIAGNOSTIC_SUPPRESS_KEY, String(Date.now() + ms));
}

export function clearDiagnosticsSuppression() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DIAGNOSTIC_SUPPRESS_KEY);
}

export function isDiagnosticsSuppressed() {
  return getDiagnosticsSuppressedUntil() > Date.now();
}

export async function verifyAndRepairOwnPublishedKey(userId: string): Promise<KeySyncCheck> {
  const issues: DiagnosticIssue[] = [];
  const profile = await UsersService.getProfileById(userId);
  const identityRows = await tablesDB.listRows(PASSWORD_DB, IDENTITIES_TABLE, [
    Query.equal('userId', userId),
    Query.equal('identityType', 'e2e_connect'),
    Query.limit(2),
  ]);

  const liveIdentity = identityRows.rows[0] || null;
  const livePublicKey = liveIdentity?.publicKey || null;
  const profilePublicKey = profile?.publicKey || null;

  if (identityRows.total > 1) {
    issues.push({
      title: 'Duplicate live identities',
      detail: 'More than one e2e_connect identity row exists for this account, which can cause Connect to read the wrong published key.',
      severity: 'warning',
    });
  }

  if (!profile) {
    issues.push({
      title: 'Profile missing',
      detail: 'Your chat profile row was not found, so Connect cannot publish or verify your live public key yet.',
      severity: 'error',
    });
  }

  if (!liveIdentity) {
    issues.push({
      title: 'Connect identity missing',
      detail: 'No live e2e_connect identity row exists in Password Manager, which usually means vault setup or unlock sync has not completed.',
      severity: 'error',
    });
    return {
      healthy: false,
      fixed: false,
      issues,
      profilePublicKey,
      livePublicKey,
    };
  }

  if (!livePublicKey) {
    issues.push({
      title: 'Live public key missing',
      detail: 'The identity row exists, but its publicKey field is empty, so Connect cannot publish a trusted key to chat.profiles.',
      severity: 'error',
    });
    return {
      healthy: false,
      fixed: false,
      issues,
      profilePublicKey,
      livePublicKey,
    };
  }

  if (profilePublicKey === livePublicKey) {
    return {
      healthy: issues.length === 0,
      fixed: false,
      issues,
      profilePublicKey,
      livePublicKey,
    };
  }

  if (!profile) {
    issues.push({
      title: 'Unable to auto-heal',
      detail: 'The live key is available, but your profile row is missing so Connect cannot safely republish it.',
      severity: 'error',
    });
    return {
      healthy: false,
      fixed: false,
      issues,
      profilePublicKey,
      livePublicKey,
    };
  }

  try {
    await UsersService.updateProfile(userId, { publicKey: livePublicKey });
    issues.push({
      title: 'Published key repaired',
      detail: 'Your chat profile public key was stale, so Connect replaced it with the live identity-table key.',
      severity: 'warning',
    });
    return {
      healthy: true,
      fixed: true,
      issues,
      profilePublicKey,
      livePublicKey,
    };
  } catch (error: any) {
    issues.push({
      title: 'Failed to republish key',
      detail: error?.message || 'Connect found a mismatch but could not update chat.profiles automatically.',
      severity: 'error',
    });
    return {
      healthy: false,
      fixed: false,
      issues,
      profilePublicKey,
      livePublicKey,
    };
  }
}

export async function inspectConversationDecryption(
  conversationId: string,
  userId: string,
  messages: Array<{ $id?: string; senderId?: string; content?: unknown; metadata?: unknown }> = [],
  preferredMessageId?: string | null,
): Promise<ConversationDiagnostic> {
  const issues: DiagnosticIssue[] = [];
  const tips: string[] = [];
  let encryptedCount = 0;
  let decryptedCount = 0;
  let partnerUserId: string | null = null;
  let partnerPublicKey: string | null = null;

  messages.forEach((message) => {
    const textEncrypted = isLikelyEncryptedPayload(message?.content);
    const metaEncrypted = isLikelyEncryptedPayload(message?.metadata);
    if (textEncrypted || metaEncrypted) encryptedCount += 1;
    else decryptedCount += 1;
  });

  let hasConversationWrap = false;
  try {
    const conv = await tablesDB.getRow(CHAT_DB, CONVERSATIONS_TABLE, conversationId);
    partnerUserId = Array.isArray(conv?.participants)
      ? conv.participants.find((participantId: string) => participantId && participantId !== userId) || null
      : null;

    if (partnerUserId) {
      const partnerProfile = await UsersService.getProfileById(partnerUserId);
      partnerPublicKey = partnerProfile?.publicKey || null;
    }

    const [chatWraps, epochWraps] = await Promise.all([
      tablesDB.listRows(PASSWORD_DB, KEY_MAPPING_TABLE, [
        Query.equal('resourceType', 'chat'),
        Query.equal('resourceId', conversationId),
        Query.equal('grantee', userId),
        Query.limit(1),
      ]),
      tablesDB.listRows(PASSWORD_DB, KEY_MAPPING_TABLE, [
        Query.equal('resourceType', 'epoch'),
        Query.equal('resourceId', conversationId),
        Query.equal('grantee', userId),
        Query.limit(1),
      ]),
    ]);

    hasConversationWrap = chatWraps.total > 0 || epochWraps.total > 0;
    if (!hasConversationWrap) {
      issues.push({
        title: 'Missing wrap for this account',
        detail: 'This conversation row does not currently contain a wrap for your user ID, so a live key refresh is needed.',
        severity: 'error',
      });
    }
  } catch (error: any) {
    issues.push({
      title: 'Conversation inspection failed',
      detail: error?.message || 'Connect could not inspect the conversation row while diagnosing encryption.',
      severity: 'warning',
    });
  }

  const sampleCandidate = preferredMessageId
    ? messages.find((message) => message.$id === preferredMessageId)
    : messages.find((message) => message?.senderId && message.senderId !== userId && (isLikelyEncryptedPayload(message.content) || isLikelyEncryptedPayload(message.metadata)))
      || messages.find((message) => isLikelyEncryptedPayload(message.content) || isLikelyEncryptedPayload(message.metadata))
      || null;

  let sampleMessageId: string | null = sampleCandidate?.$id || null;
  let sampleDecryptOk = false;
  let sampleWrapOk = false;
  let mockSendOk = false;

  if (sampleCandidate) {
    const convKey = ecosystemSecurity.getConversationKey(conversationId);
    const probeValue = (typeof sampleCandidate.content === 'string' && isLikelyEncryptedPayload(sampleCandidate.content))
      ? sampleCandidate.content
      : (typeof sampleCandidate.metadata === 'string' && isLikelyEncryptedPayload(sampleCandidate.metadata))
        ? sampleCandidate.metadata
        : null;

    if (probeValue && convKey) {
      try {
        const decrypted = await ecosystemSecurity.decryptWithKey(probeValue, convKey);
        sampleDecryptOk = !!decrypted;
      } catch {
        sampleDecryptOk = false;
      }
    }
  }

  if (ecosystemSecurity.status.isUnlocked) {
    try {
      const mockKey = await ecosystemSecurity.generateConversationKey();
      const plaintext = 'kylrix-diagnostic-probe';
      const cipher = await ecosystemSecurity.encryptWithKey(plaintext, mockKey);
      const roundTrip = await ecosystemSecurity.decryptWithKey(cipher, mockKey);
      mockSendOk = roundTrip === plaintext;
    } catch {
      mockSendOk = false;
    }
  }

  if (partnerPublicKey && ecosystemSecurity.status.hasIdentity) {
    try {
      const probeKey = await ecosystemSecurity.generateConversationKey();
      await ecosystemSecurity.wrapKeyWithECDH(probeKey, partnerPublicKey);
      sampleWrapOk = true;
    } catch {
      sampleWrapOk = false;
    }
  }

  if (encryptedCount > 0 && decryptedCount > 0) {
    tips.push('Some messages decrypt and some do not, which usually means a stale wrap or a legacy payload in this thread.');
    tips.push('Open a different message and let Connect re-scan the thread with the live key state.');
  } else if (encryptedCount > 0) {
    tips.push('If every message still looks encrypted after vault unlock, the conversation key or profile publish step is likely out of sync.');
    tips.push('Refresh the conversation so Connect can re-read the live identity key and rebuild the wrap.');
  } else {
    tips.push('No encrypted payloads were detected in the current window.');
  }

  if (!mockSendOk) {
    issues.push({
      title: 'Local crypto probe failed',
      detail: 'Connect could not round-trip a mock encrypted message locally, which points to a vault or runtime crypto problem.',
      severity: 'error',
    });
  }

  if (partnerPublicKey && !sampleWrapOk) {
    issues.push({
      title: 'Partner public key probe failed',
      detail: 'Connect could not wrap a test key with the other person\'s live published public key, which suggests stale or malformed published identity data.',
      severity: 'error',
    });
  }

  if (sampleCandidate && !sampleDecryptOk && hasConversationWrap) {
    issues.push({
      title: 'Sample message still opaque',
      detail: 'A visible encrypted message could not be decrypted with the current conversation key, even though your wrap exists. The stored wrap may be stale or the thread may have mixed legacy payloads.',
      severity: 'warning',
    });
  }

  const live = ecosystemSecurity.status.isUnlocked && hasConversationWrap;
  const probeSummary = sampleMessageId
    ? sampleDecryptOk
      ? `Sample message ${sampleMessageId} decrypted successfully.`
      : `Sample message ${sampleMessageId} stayed encrypted under the current live key state.`
    : 'No sample encrypted message was available to probe.';

  return {
    healthy: (encryptedCount === 0 || live) && mockSendOk && (partnerPublicKey ? sampleWrapOk !== false : true) && (sampleCandidate ? sampleDecryptOk || !hasConversationWrap : true),
    live,
    partnerUserId,
    partnerPublicKey,
    encryptedCount,
    decryptedCount,
    hasConversationWrap,
    sampleMessageId,
    sampleDecryptOk,
    sampleWrapOk,
    mockSendOk,
    probeSummary,
    issues,
    tips,
  };
}
