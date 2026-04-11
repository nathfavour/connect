import { ID, Permission, Query, Role } from 'appwrite';
import { account, tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { KYLRIX_AUTH_URI } from '../constants';
import { ecosystemSecurity } from '../ecosystem/security';
import { UsersService } from './users';


const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const CONV_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS;
const CONV_MEMBERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CONVERSATION_MEMBERS || 'conversationMembers';
const MSG_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MESSAGES;
const EPOCHS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.EPOCHS;
const KEY_MAPPING_DB = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
const KEY_MAPPING_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.KEY_MAPPING;
const ACCOUNTS_API_URL = `${KYLRIX_AUTH_URI}/api/permissions`;
const conversationKeyCache = new Map<string, CryptoKey>();

const arraysEqual = (left: string[], right: string[]) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const canonicalizeParticipantsForMatch = (participants: string[]) =>
    Array.from(new Set((participants || []).filter(Boolean))).sort();

const getConversationActivityAt = (row: any) =>
    row?.lastMessageAt || row?.updatedAt || row?.createdAt || row?.$updatedAt || row?.$createdAt || null;

const getMessageActivityAt = (row: any) =>
    row?.createdAt || row?.updatedAt || row?.$createdAt || row?.$updatedAt || null;

const buildMessagePermissions = (senderId: string) => {
    return [
        Permission.read(Role.user(senderId)),
        Permission.update(Role.user(senderId)),
        Permission.delete(Role.user(senderId)),
    ];
};

const buildConversationMemberPermissions = (_participantIds: string[], creatorId: string) => {
    return [
        Permission.read(Role.user(creatorId)),
        Permission.update(Role.user(creatorId)),
        Permission.delete(Role.user(creatorId)),
    ];
};

const syncMessagePermissions = async (
    rowId: string,
    recipientIds: string[],
    permission: 'read' | 'write' | 'admin' = 'read',
    auth?: { jwt?: string; cookie?: string },
    ownerId?: string
) => {
    const targets = Array.from(new Set(recipientIds.filter(Boolean)));
    if (!rowId || targets.length === 0) return;
    await callPermissionsApi('POST', {
        databaseId: APPWRITE_CONFIG.DATABASES.CHAT,
        tableId: MSG_TABLE,
        rowId,
        targetUserIds: targets,
        permission,
        ownerId,
    }, auth);
};

const normalizeConversationRow = async (conversation: any) => {
    if (!conversation) return conversation;

    const participants: string[] = Array.isArray(conversation.participants)
        ? conversation.participants.filter((participant: unknown): participant is string => typeof participant === 'string' && participant.length > 0)
        : [];
    const normalizedParticipants = Array.from(new Set(participants));
    const creatorId = conversation.creatorId;

    if (arraysEqual(participants, normalizedParticipants) && creatorId === conversation.creatorId) {
        return conversation;
    }

    return {
        ...conversation,
        participants: normalizedParticipants,
        creatorId
    };
};

const getMessagePreview = async (message: any, conversationId: string) => {
    if (!message) return '';
    if (message.type && message.type !== 'text' && message.type !== 'attachment') {
        return `[${message.type}]`;
    }

    const rawContent = message.content || '';
    if (!rawContent) return '';

    if (!ecosystemSecurity.status.isUnlocked || rawContent.length <= 40) {
        return rawContent;
    }

    try {
        const convKey = ecosystemSecurity.getConversationKey(conversationId);
        if (convKey) {
            return await ecosystemSecurity.decryptWithKey(rawContent, convKey);
        }
        return await ecosystemSecurity.decrypt(rawContent);
    } catch (_e) {
        return '[Encrypted message]';
    }
};

type LockboxEntry = {
    resourceType: string;
    resourceId: string;
    grantee: string;
    wrappedKey: string;
    metadata?: string | Record<string, unknown> | null;
};

const buildLockboxMetadata = (payload: Record<string, unknown>) => JSON.stringify(payload);

async function getPermissionUpdateAuth(auth?: { jwt?: string; cookie?: string }) {
    let jwt = auth?.jwt || null;
    if (!jwt && !auth?.cookie) {
        const session = await account.createJWT().catch(() => null);
        jwt = session?.jwt || null;
    }

    if (!jwt && !auth?.cookie) {
        throw new Error('Unable to authenticate permission update request');
    }

    return {
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        ...(auth?.cookie ? { Cookie: auth.cookie } : {}),
    };
}

async function callPermissionsApi(
    method: 'POST' | 'DELETE',
    payload: Record<string, unknown>,
    auth?: { jwt?: string; cookie?: string }
) {
    const headers = await getPermissionUpdateAuth(auth);
    const response = await fetch(ACCOUNTS_API_URL, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Permission update failed');
    }

    return response.json().catch(() => ({}));
}

async function fetchKeyMapping(resourceType: string, resourceId: string, grantee: string) {
    const res = await tablesDB.listRows(KEY_MAPPING_DB, KEY_MAPPING_TABLE, [
        Query.equal('resourceType', resourceType),
        Query.equal('resourceId', resourceId),
        Query.equal('grantee', grantee),
        Query.limit(1),
    ]);

    return res.rows[0] || null;
}

async function fetchProfilePublicKey(userId: string) {
    try {
        const profile = await UsersService.getProfileById(userId);
        return profile?.publicKey || null;
    } catch {
        return null;
    }
}

async function unwrapKeyMapping(row: any, fallbackUserId?: string) {
    if (!row?.wrappedKey || !row?.grantee) return null;

    let metadata: Record<string, any> = {};
    try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {};
    } catch {
        metadata = {};
    }

    const wrappedByPublicKey = metadata.wrappedByPublicKey
        || (metadata.wrappedBy ? await fetchProfilePublicKey(metadata.wrappedBy) : null)
        || (fallbackUserId ? await fetchProfilePublicKey(fallbackUserId) : null);

    if (!wrappedByPublicKey) {
        return null;
    }

    const key = await ecosystemSecurity.unwrapKeyWithECDH(row.wrappedKey, wrappedByPublicKey);
    return key || null;
}

async function fetchConversationKeyFromLockbox(conversationId: string, userId: string, creatorId?: string) {
    const row = await fetchKeyMapping('chat', conversationId, userId);
    if (!row) return null;
    return unwrapKeyMapping(row, creatorId || userId);
}

async function fetchEpochKeyForConversation(conversationId: string, userId: string, messageCreatedAt?: string | null) {
    const epochsRes = await tablesDB.listRows(APPWRITE_CONFIG.DATABASES.CHAT, EPOCHS_TABLE, [
        Query.equal('resourceId', conversationId),
        Query.orderDesc('epochNumber'),
        Query.limit(50),
    ]);

    const epochs = epochsRes.rows || [];
    const messageTime = messageCreatedAt ? new Date(messageCreatedAt).getTime() : Number.NaN;

    for (const epoch of epochs) {
        if (Number.isFinite(messageTime)) {
            const epochTime = new Date(epoch.$createdAt || epoch.createdAt || 0).getTime();
            if (epochTime > messageTime) {
                continue;
            }
        }

        const row = await fetchKeyMapping('epoch', epoch.$id, userId);
        const key = await unwrapKeyMapping(row, epoch.createdBy || userId);
        if (key) return key;
    }

    return null;
}

async function resolveConversationKey(
    conversation: any,
    userId: string,
    messageCreatedAt?: string | null
) {
    if (!conversation?.$id || !userId) return null;

    if (ecosystemSecurity.status.isUnlocked && !ecosystemSecurity.status.hasIdentity) {
        try {
            await ecosystemSecurity.ensureE2EIdentity(userId);
        } catch (error) {
            console.warn('[ChatService] Failed to initialize E2E identity before key resolution:', error);
            return null;
        }
    }

    const cached = conversationKeyCache.get(conversation.$id);
    if (cached && !messageCreatedAt) {
        return cached;
    }

    if (conversation.type === 'group' && String(conversation.encryptionVersion || '').toUpperCase() === 'T4') {
        const epochKey = await fetchEpochKeyForConversation(conversation.$id, userId, messageCreatedAt);
        if (epochKey && !messageCreatedAt) {
            conversationKeyCache.set(conversation.$id, epochKey);
        }
        return epochKey;
    }

    const directKey = await fetchConversationKeyFromLockbox(conversation.$id, userId, conversation.creatorId);
    if (directKey) {
        if (!messageCreatedAt) {
            conversationKeyCache.set(conversation.$id, directKey);
        }
        return directKey;
    }

    return null;
}

async function syncLockboxRows(entries: LockboxEntry[], auth?: { jwt?: string; cookie?: string }) {
    if (!entries.length) return [];
    return callPermissionsApi('POST', { action: 'grant', keyMappings: entries }, auth);
}

async function syncConversationAccess(
    conversationId: string,
    participantIds: string[],
    permission: 'read' | 'write' = 'read',
    ownerId?: string
) {
    const targets = Array.from(new Set(participantIds.filter(Boolean)));
    if (!conversationId || targets.length === 0) return;
    return callPermissionsApi('POST', {
        databaseId: APPWRITE_CONFIG.DATABASES.CHAT,
        tableId: CONV_TABLE,
        rowId: conversationId,
        targetUserIds: targets,
        permission,
        ownerId,
        action: 'grant',
    });
}

export const ChatService = {
    async _unwrapConversationKey(conv: any, myUserId: string): Promise<CryptoKey | null> {
        const key = await resolveConversationKey(conv, myUserId);
        if (key) {
            conversationKeyCache.set(conv.$id, key);
        }
        return key;
    },

    async rewrapConversationKeys(_conversationId: string) {
        return;
    },
    async getConversationById(conversationId: string, userId?: string) {
        const conv = await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
        const normalizedConversation = await normalizeConversationRow(conv);
        const hydrated = await this._hydrateConversationParticipants(normalizedConversation);
        return await this._decryptConversation(hydrated, userId);
    },

    async _hydrateConversationParticipants(conversation: any) {
        if (!conversation?.$id) return conversation;
        const existingParticipants = Array.isArray(conversation.participants) ? conversation.participants.filter(Boolean) : [];
        if (existingParticipants.length > 0) {
            return conversation;
        }

        try {
            const memberRows = await tablesDB.listRows(DB_ID, CONV_MEMBERS_TABLE, [
                Query.equal('conversationId', conversation.$id),
                Query.limit(1000),
            ]);

            const participants = Array.from(new Set(
                memberRows.rows
                    .map((row: any) => row.userId)
                    .filter(Boolean)
            ));

            if (!participants.length) return conversation;

            return { ...conversation, participants };
        } catch (_e) {
            return conversation;
        }
    },

    async _decryptConversation(conv: any, userId?: string) {
        if (!conv.isEncrypted || !ecosystemSecurity.status.isUnlocked) return conv;
        try {
            let convKey: CryptoKey | null = null;
            if (userId) {
                convKey = await resolveConversationKey(conv, userId);
            } else {
                convKey = conversationKeyCache.get(conv.$id) || ecosystemSecurity.getConversationKey(conv.$id);
            }

            if (convKey) {
                if (conv.name && conv.name.length > 40) {
                    conv.name = await ecosystemSecurity.decryptWithKey(conv.name, convKey);
                }
                if (conv.lastMessageText && conv.lastMessageText.length > 40) {
                    conv.lastMessageText = await ecosystemSecurity.decryptWithKey(conv.lastMessageText, convKey);
                }
                return conv;
            }
        } catch (_e: unknown) {
            throw _e;
        }
        return conv;
    },

    async getConversations(userId: string) {
        console.log('[ChatService] getConversations for:', userId);

        const memberRows = await tablesDB.listRows(DB_ID, CONV_MEMBERS_TABLE, [
            Query.equal('userId', userId),
            Query.limit(1000)
        ]).catch(() => ({ rows: [] as any[] }));

        const conversationIds = Array.from(new Set(
            (memberRows.rows || [])
                .map((row: any) => row.conversationId)
                .filter(Boolean)
        ));

        let conversationRows: any[] = [];
        let memberRowsByConversation = new Map<string, string[]>();

        if (conversationIds.length > 0) {
            const conversationsResult = await tablesDB.listRows(DB_ID, CONV_TABLE, [
                Query.equal('$id', conversationIds),
                Query.limit(conversationIds.length)
            ]).catch(() => ({ rows: [] as any[] }));

            conversationRows = conversationsResult.rows || [];

            const allMembers = await tablesDB.listRows(DB_ID, CONV_MEMBERS_TABLE, [
                Query.equal('conversationId', conversationIds),
                Query.limit(Math.min(1000, conversationIds.length * 10))
            ]).catch(() => ({ rows: [] as any[] }));

            memberRowsByConversation = new Map<string, string[]>();
            for (const row of allMembers.rows || []) {
                if (!row?.conversationId || !row?.userId) continue;
                const existing = memberRowsByConversation.get(row.conversationId) || [];
                if (!existing.includes(row.userId)) existing.push(row.userId);
                memberRowsByConversation.set(row.conversationId, existing);
            }
        } else {
            const legacy = await tablesDB.listRows(DB_ID, CONV_TABLE, [
                Query.contains('participants', userId),
                Query.limit(100)
            ]).catch(() => ({ rows: [] as any[] }));
            conversationRows = legacy.rows || [];
            for (const conversation of conversationRows) {
                const participants = Array.isArray(conversation.participants) ? conversation.participants.filter(Boolean) : [];
                if (participants.length) memberRowsByConversation.set(conversation.$id, participants);
            }
        }

        const previewConversationIds = conversationIds.length > 0
            ? conversationIds
            : conversationRows.map((conversation) => conversation.$id).filter(Boolean);
        const needsPreviewHydration = conversationRows.some((conversation) => !conversation.lastMessageAt || !conversation.lastMessageText);
        const latestMessageByConversation = new Map<string, any>();

        if (needsPreviewHydration && previewConversationIds.length > 0) {
            const recentMessagesResult = await tablesDB.listRows(DB_ID, MSG_TABLE, [
                Query.equal('conversationId', previewConversationIds),
                Query.orderDesc('createdAt'),
                Query.limit(Math.min(1000, previewConversationIds.length * 20))
            ]).catch(() => ({ rows: [] as any[] }));

            for (const message of recentMessagesResult.rows || []) {
                if (message?.conversationId && !latestMessageByConversation.has(message.conversationId)) {
                    latestMessageByConversation.set(message.conversationId, message);
                }
            }
        }

        const rows = await Promise.all(conversationRows.map(async (conversation: any) => {
            const participants = memberRowsByConversation.get(conversation.$id) || conversation.participants || [];
            const normalizedConversation = {
                ...conversation,
                participants: Array.from(new Set((participants || []).filter(Boolean)))
            };
            const latestMessage = latestMessageByConversation.get(conversation.$id);
            const hydratedConversation = latestMessage ? {
                ...normalizedConversation,
                lastMessageAt: getMessageActivityAt(latestMessage) || normalizedConversation.lastMessageAt,
                lastMessageText: normalizedConversation.lastMessageText || await getMessagePreview(latestMessage, conversation.$id)
            } : normalizedConversation;

            return this._decryptConversation(hydratedConversation, userId);
        }));

        rows.sort((a, b) => {
            const timeA = new Date(getConversationActivityAt(a) || 0).getTime();
            const timeB = new Date(getConversationActivityAt(b) || 0).getTime();
            return timeB - timeA;
        });

        return {
            total: rows.length,
            rows
        };
    },

    async createConversation(participants: string[], type: 'direct' | 'group' = 'direct', name?: string) {
        if (!ecosystemSecurity.status.isUnlocked) {
            throw new Error('Vault must be unlocked before creating conversations');
        }

        if (!ecosystemSecurity.status.hasIdentity) {
            throw new Error('E2E identity must be initialized before creating conversations');
        }

        const creatorId = participants[0];
        const isSelf = type === 'direct' && participants.length === 1 && participants[0] === participants[participants.length - 1];
        const uniqueParticipants = isSelf ? [participants[0], participants[0]] : Array.from(new Set(participants));

        // GUARD: Prevent duplicate direct chats by checking server-side first
        if (type === 'direct') {
            const creatorMemberships = await tablesDB.listRows(DB_ID, CONV_MEMBERS_TABLE, [
                Query.equal('userId', creatorId),
                Query.limit(1000)
            ]).catch(() => ({ rows: [] as any[] }));

            const candidateConversationIds = Array.from(new Set(
                (creatorMemberships.rows || [])
                    .map((row: any) => row.conversationId)
                    .filter(Boolean)
            ));

            if (candidateConversationIds.length > 0) {
                const existing = await tablesDB.listRows(DB_ID, CONV_TABLE, [
                    Query.equal('$id', candidateConversationIds),
                    Query.equal('type', 'direct'),
                    Query.limit(candidateConversationIds.length)
                ]).catch(() => ({ rows: [] as any[] }));

                const candidateRows = existing.rows || [];
                if (candidateRows.length > 0) {
                    const membershipRows = await tablesDB.listRows(DB_ID, CONV_MEMBERS_TABLE, [
                        Query.equal('conversationId', candidateConversationIds),
                        Query.limit(Math.min(1000, candidateConversationIds.length * 10))
                    ]).catch(() => ({ rows: [] as any[] }));

                    const participantsByConversation = new Map<string, string[]>();
                    for (const row of membershipRows.rows || []) {
                        if (!row?.conversationId || !row?.userId) continue;
                        const current = participantsByConversation.get(row.conversationId) || [];
                        if (!current.includes(row.userId)) current.push(row.userId);
                        participantsByConversation.set(row.conversationId, current);
                    }

                    const targetParticipantSet = canonicalizeParticipantsForMatch(uniqueParticipants);
                    for (const conversation of candidateRows) {
                        const existingParticipantSet = canonicalizeParticipantsForMatch(
                            participantsByConversation.get(conversation.$id) || []
                        );

                        if (arraysEqual(existingParticipantSet, targetParticipantSet)) {
                            console.log('[ChatService] Direct chat already exists, returning existing:', conversation.$id);
                            return conversation;
                        }
                    }
                }
            }
        }

        let convKey: CryptoKey | null = null;

        // E2E Layer: Only if vault is unlocked and identity is ready
        if (ecosystemSecurity.status.isUnlocked && ecosystemSecurity.status.hasIdentity) {
            // 1. Generate unique Group/Conversation Key
            convKey = await ecosystemSecurity.generateConversationKey();
        }

        // 3. Encrypt name and metadata if it's a group
        let encryptedName = name;
        if (name && convKey && ecosystemSecurity.status.isUnlocked) {
            encryptedName = await ecosystemSecurity.encryptWithKey(name, convKey);
        }

        const conversationPermissions = buildConversationMemberPermissions(uniqueParticipants, creatorId);

        const now = new Date().toISOString();

        const newConv = await tablesDB.createRow(DB_ID, CONV_TABLE, ID.unique(), {
            participants: uniqueParticipants,
            participantCount: uniqueParticipants.length,
            type: type || 'direct',
            name: encryptedName || 'Direct Chat',
            creatorId,
            admins: type === 'group' ? [creatorId] : uniqueParticipants,
            isPinned: [],
            isMuted: [],
            isArchived: [],
            tags: [],
            isEncrypted: !!convKey,
            encryptionVersion: convKey ? 'T4' : '1.0',
            createdAt: now,
            updatedAt: now,
        }, conversationPermissions);

        const memberRows = await Promise.all(uniqueParticipants.map((participantId) =>
            tablesDB.createRow(
                DB_ID,
                CONV_MEMBERS_TABLE,
                ID.unique(),
                {
                    conversationId: newConv.$id,
                    userId: participantId,
                },
                buildConversationMemberPermissions(uniqueParticipants, creatorId)
            ).catch(() => null)
        ));

        await Promise.all(memberRows.filter(Boolean).map((memberRow: any) =>
            callPermissionsApi('POST', {
                databaseId: APPWRITE_CONFIG.DATABASES.CHAT,
                tableId: CONV_MEMBERS_TABLE,
                rowId: memberRow.$id,
                ownerId: creatorId,
                targetUserIds: uniqueParticipants,
                permission: 'read',
                action: 'grant',
            }).catch((error) => {
                console.error('[ChatService] Failed to grant conversation member access:', error);
                throw error;
            })
        ));

        // Cache the local key for this session
        if (convKey) {
            ecosystemSecurity.setConversationKey(newConv.$id, convKey);
            conversationKeyCache.set(newConv.$id, convKey);
            try {
                const creatorPublicKey = ecosystemSecurity.status.hasIdentity
                    ? await ecosystemSecurity.ensureE2EIdentity(creatorId)
                    : null;

                if (creatorPublicKey) {
                    const directLockboxRows: LockboxEntry[] = await Promise.all(uniqueParticipants.map(async (participantId) => {
                        const profile = await UsersService.getProfileById(participantId);
                        if (!profile?.publicKey) return null;

                        return {
                            resourceType: 'chat',
                            resourceId: newConv.$id,
                            grantee: participantId,
                            wrappedKey: await ecosystemSecurity.wrapKeyWithECDH(convKey, profile.publicKey),
                            metadata: buildLockboxMetadata({
                                wrappedBy: creatorId,
                                wrappedByPublicKey: creatorPublicKey,
                                conversationId: newConv.$id,
                                conversationType: type,
                                version: 't4',
                            }),
                        };
                    })).then((rows) => rows.filter(Boolean) as LockboxEntry[]);

                    if (type === 'group') {
                        await callPermissionsApi('POST', {
                            action: 'rotate_epoch',
                            resourceId: newConv.$id,
                            ownerId: creatorId,
                            participantUserIds: uniqueParticipants,
                            epochNumber: 1,
                            keyMappings: directLockboxRows.map((entry) => ({
                                ...entry,
                                resourceType: 'epoch',
                                resourceId: newConv.$id,
                            })),
                        });
                    } else if (directLockboxRows.length > 0) {
                        await syncLockboxRows(directLockboxRows);
                    }

                    const recipientIds = uniqueParticipants.filter((id) => id !== creatorId);
                    if (recipientIds.length > 0) {
                        await syncConversationAccess(
                            newConv.$id,
                            recipientIds,
                            type === 'direct' ? 'write' : 'read',
                            creatorId
                        );
                    }
                }
            } catch (lockboxErr) {
                console.error('[ChatService] Failed to persist lockbox rows:', lockboxErr);
            }
        }

        return newConv;
    },

    async sendMessage(
        conversationId: string, 
        senderId: string, 
        content: string, 
        type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call_signal' | 'system' | 'attachment' = 'text', 
        attachments: string[] = [], 
        replyTo?: string,
        metadata?: any,
        permissionSyncAuth?: { jwt?: string; cookie?: string }
    ) {
        let conversation: any = null;

        // E2E Layer: Universal Handshake Protocol
        let finalContent = content;
        let finalMetadata = metadata;

        try {
        const rawConversation = await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
            conversation = await this._hydrateConversationParticipants(await normalizeConversationRow(rawConversation));
        } catch (_e) {
            conversation = null;
        }

        if (conversation?.participants?.length && !conversation.participants.includes(senderId)) {
            throw new Error('You are not a participant in this conversation');
        }

        if ((type === 'text' || type === 'attachment') && ecosystemSecurity.status.isUnlocked) {
            const convKey = conversation ? await resolveConversationKey(conversation, senderId) : null;
            if (!convKey) throw new Error('Conversation key not available');
            finalContent = await ecosystemSecurity.encryptWithKey(content, convKey);
            if (metadata) {
                const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
                finalMetadata = await ecosystemSecurity.encryptWithKey(metaStr, convKey);
            }
        }

        const recipientIds = Array.isArray(conversation?.participants)
            ? conversation.participants.filter((participantId: string) => participantId && participantId !== senderId)
            : [];

        const permissions = buildMessagePermissions(senderId);

        // 1. Create Message with explicit permissions
        const now = new Date().toISOString();

        const message = await tablesDB.createRow(DB_ID, MSG_TABLE, ID.unique(), {
            conversationId,
            senderId,
            content: finalContent,
            type,
            attachments,
            replyTo,
            readBy: [senderId],
            metadata: finalMetadata,
            createdAt: now,
            updatedAt: now,
        }, permissions);

        if (recipientIds.length > 0) {
            await syncMessagePermissions(message.$id, recipientIds, 'read', permissionSyncAuth, senderId);
        }

        // 2. Best-effort conversation preview update.
        // In a client-only model only the creator can mutate the shared row, so list UIs must
        // derive freshness from message activity instead of depending on this always succeeding.
        if (conversation?.creatorId === senderId) {
            try {
                const now = new Date().toISOString();
                await tablesDB.updateRow(DB_ID, CONV_TABLE, conversationId, {
                    lastMessageId: message.$id,
                    lastMessageAt: now,
                    lastMessageText: type === 'text' ? finalContent : `[${type}]`,
                });
            } catch (_e) {
                console.warn('[ChatService] Conversation preview update skipped');
            }
        }

        // 3. (Background) Re-keying check
        if (ecosystemSecurity.status.isUnlocked && conversation?.creatorId === senderId) {
            this.rewrapConversationKeys(conversationId).catch(err =>
                console.warn("[ChatService] Background re-wrap failed:", err)
            );
        }

        return message;
    },

    async getMessages(conversationId: string, limit = 50, offset = 0, userId?: string) {
        // Ensure UI has explicitly unwrapped the Conversation Key before fetching messages
        const _conv = await this.getConversationById(conversationId, userId);
        const convKey = userId ? await resolveConversationKey(_conv, userId) : conversationKeyCache.get(conversationId) || ecosystemSecurity.getConversationKey(conversationId);

        const res = await tablesDB.listRows(DB_ID, MSG_TABLE, [
            Query.equal('conversationId', conversationId),
            Query.orderDesc('createdAt'),
            Query.limit(limit),
            Query.offset(offset)
        ]);

        // Decrypt messages in parallel
        res.rows = await Promise.all(res.rows.map(async (msg: any) => {
            const isEncrypted = ecosystemSecurity.status.isUnlocked && (
                (msg.type === 'text' && msg.content && msg.content.length > 40) ||
                (msg.metadata && msg.metadata.length > 40)
            );

            if (isEncrypted) {
                let messageKey = _conv?.type === 'group' && String(_conv?.encryptionVersion || '').toUpperCase() === 'T4' && userId
                    ? await resolveConversationKey(_conv, userId, msg.createdAt)
                    : convKey;
                if (!messageKey && userId) {
                    await UsersService.forceSyncProfileWithIdentity({ $id: userId });
                    messageKey = _conv?.type === 'group' && String(_conv?.encryptionVersion || '').toUpperCase() === 'T4'
                        ? await resolveConversationKey(_conv, userId, msg.createdAt)
                        : await resolveConversationKey(_conv, userId);
                }
                if (!messageKey) return msg;

                if (msg.type === 'text' && msg.content && msg.content.length > 40) {
                    msg.content = await ecosystemSecurity.decryptWithKey(msg.content, messageKey);
                }
                if (msg.metadata && msg.metadata.length > 40) {
                    const decryptedMeta = await ecosystemSecurity.decryptWithKey(msg.metadata, messageKey);
                    try {
                        msg.metadata = JSON.parse(decryptedMeta);
                    } catch {
                        msg.metadata = decryptedMeta;
                    }
                }
            }
            return msg;
        }));

        return res;
    },

    /**
     * Wipes all messages authored by the user in this conversation.
     * Hard-deletes documents from the server.
     */
    async wipeMyFootprint(conversationId: string, userId: string) {
        console.log(`[ChatService] Wiping footprint for ${userId} in ${conversationId}`);
        // 1. Fetch all messages sent by this user
        const res = await tablesDB.listRows(DB_ID, MSG_TABLE, [
            Query.equal('conversationId', conversationId),
            Query.equal('senderId', userId),
            Query.limit(1000) // Max limit for a wipe
        ]);

        // 2. Bulk delete in parallel batches of 10
        const batches = [];
        for (let i = 0; i < res.rows.length; i += 10) {
            const batch = res.rows.slice(i, i + 10).map(msg => tablesDB.deleteRow(DB_ID, MSG_TABLE, msg.$id));
            batches.push(Promise.all(batch));
        }
        await Promise.all(batches);
        return { success: true, count: res.total };
    },

    /**
     * Sets a 'clearedAt' timestamp for the user in the conversation settings.
     * This is a 'soft-delete' that provides a clean slate without affecting others.
     */
    async clearChatForMe(conversationId: string, userId: string) {
        const conv = await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
        let settings: any = {};

        try {
            if (conv.settings) {
                const decryptedSettings = await ecosystemSecurity.decrypt(conv.settings);
                settings = JSON.parse(decryptedSettings);
            }
        } catch (_e: unknown) {
            // Settings might be empty or unencrypted
        }

        if (!settings.clearedAt) settings.clearedAt = {};
        settings.clearedAt[userId] = new Date().toISOString();

        const encryptedSettings = await ecosystemSecurity.encrypt(JSON.stringify(settings));

        return await tablesDB.updateRow(DB_ID, CONV_TABLE, conversationId, {
            settings: encryptedSettings
        });
    },

    /**
     * Entirely deletes all messages in a conversation (Reserved for Saved Messages/Self-Chat)
     */
    async nuclearWipe(conversationId: string) {
        const res = await tablesDB.listRows(DB_ID, MSG_TABLE, [
            Query.equal('conversationId', conversationId),
            Query.limit(1000)
        ]);

        const batches = [];
        for (let i = 0; i < res.rows.length; i += 10) {
            const batch = res.rows.slice(i, i + 10).map(msg => tablesDB.deleteRow(DB_ID, MSG_TABLE, msg.$id));
            batches.push(Promise.all(batch));
        }
        await Promise.all(batches);
        return { success: true };
    },

    async updateConversation(conversationId: string, data: Partial<{
        name: string;
        description: string;
        avatar: string;
        settings: string;
        participants: string[];
        admins: string[];
        isPinned: string[];
        isMuted: string[];
        isArchived: string[];
        tags: string[];
    }>) {
        return await tablesDB.updateRow(DB_ID, CONV_TABLE, conversationId, {
            ...data
        });
    },

    async addParticipant(conversationId: string, userId: string) {
        const conv = await this.getConversationById(conversationId);
        const participants = conv.participants || [];
        if (!participants.includes(userId)) {
            const memberRows = await tablesDB.listRows(DB_ID, CONV_MEMBERS_TABLE, [
                Query.equal('conversationId', conversationId),
                Query.equal('userId', userId),
                Query.limit(1)
            ]).catch(() => ({ rows: [] as any[] }));

            if (!memberRows.rows.length) {
                const memberRow = await tablesDB.createRow(DB_ID, CONV_MEMBERS_TABLE, ID.unique(), {
                    conversationId,
                    userId
                }, buildConversationMemberPermissions([...participants, userId], conv.creatorId || participants[0] || userId)).catch(() => null);

                if (memberRow?.$id) {
                    await callPermissionsApi('POST', {
                        databaseId: APPWRITE_CONFIG.DATABASES.CHAT,
                        tableId: CONV_MEMBERS_TABLE,
                        rowId: memberRow.$id,
                        ownerId: conv.creatorId || participants[0] || userId,
                        targetUserIds: [...participants, userId],
                        permission: 'read',
                        action: 'grant',
                    });
                }
            }

            const updated = await this.updateConversation(conversationId, {
                participants: [...participants, userId]
            });
            await syncConversationAccess(
                conversationId,
                [userId],
                conv.type === 'direct' ? 'write' : 'read',
                conv.creatorId || participants[0] || userId
            );
            return updated;
        }
        return conv;
    },

    async removeParticipant(conversationId: string, userId: string) {
        const conv = await this.getConversationById(conversationId);
        const requiresRotation = conv?.type === 'group' && String(conv?.encryptionVersion || '').toUpperCase() === 'T4';
        if (requiresRotation && (!ecosystemSecurity.status.isUnlocked || !ecosystemSecurity.status.hasIdentity)) {
            throw new Error('Security vault is locked; cannot rotate group epoch');
        }

        const participants = (conv.participants || []).filter((id: string) => id !== userId);
        const admins = (conv.admins || []).filter((id: string) => id !== userId);

        const memberRows = await tablesDB.listRows(DB_ID, CONV_MEMBERS_TABLE, [
            Query.equal('conversationId', conversationId),
            Query.equal('userId', userId),
            Query.limit(1)
        ]).catch(() => ({ rows: [] as any[] }));
        if (memberRows.rows[0]?.$id) {
            await tablesDB.deleteRow(DB_ID, CONV_MEMBERS_TABLE, memberRows.rows[0].$id).catch(() => null);
        }

        const updated = await this.updateConversation(conversationId, {
            participants,
            admins
        });
        await callPermissionsApi('DELETE', {
            databaseId: APPWRITE_CONFIG.DATABASES.CHAT,
            tableId: CONV_TABLE,
            rowId: conversationId,
            targetUserIds: [userId],
            resourceType: 'chat',
            resourceId: conversationId,
        });

        if (conv?.type === 'group' && String(conv?.encryptionVersion || '').toUpperCase() === 'T4' && participants.length > 0 && ecosystemSecurity.status.isUnlocked && ecosystemSecurity.status.hasIdentity) {
            const newKey = await ecosystemSecurity.generateConversationKey();
            ecosystemSecurity.setConversationKey(conversationId, newKey);
            conversationKeyCache.set(conversationId, newKey);

            const creatorProfile = await UsersService.getProfileById(conv.creatorId);
            const creatorPublicKey = creatorProfile?.publicKey || null;
            if (creatorPublicKey) {
                const keyMappings: LockboxEntry[] = [];
                for (const participantId of participants) {
                    const profile = await UsersService.getProfileById(participantId);
                    if (!profile?.publicKey) continue;
                    keyMappings.push({
                        resourceType: 'epoch',
                        resourceId: conversationId,
                        grantee: participantId,
                        wrappedKey: await ecosystemSecurity.wrapKeyWithECDH(newKey, profile.publicKey),
                        metadata: buildLockboxMetadata({
                            wrappedBy: conv.creatorId,
                            wrappedByPublicKey: creatorPublicKey,
                            conversationId,
                            conversationType: 'group',
                            version: 't4',
                            rotation: 'member-removal',
                        }),
                    });
                }

                if (keyMappings.length > 0) {
                    await callPermissionsApi('POST', {
                        action: 'rotate_epoch',
                        resourceId: conversationId,
                        participantUserIds: participants,
                        keyMappings,
                    });
                }
            }
        }

        return updated;
    },

    async deleteMessage(messageId: string) {
        return await tablesDB.deleteRow(DB_ID, MSG_TABLE, messageId);
    },

    async updateMessage(messageId: string, data: Partial<{ content: string; type: string; readBy: string[] }>) {
        return await tablesDB.updateRow(DB_ID, MSG_TABLE, messageId, {
            ...data
        });
    },

    async markAsRead(messageId: string, userId: string) {
        try {
            const message = await tablesDB.getRow(DB_ID, MSG_TABLE, messageId);
            const readBy = message.readBy || [];
            if (!readBy.includes(userId)) {
                return await tablesDB.updateRow(DB_ID, MSG_TABLE, messageId, {
                    readBy: [...readBy, userId]
                });
            }
            return message;
        } catch (error: unknown) {
            console.error('Failed to mark message as read:', error);
            return null;
        }
    },

    async markConversationAsRead(conversationId: string, userId: string) {
        // Fetch unread messages in this conversation and mark them as read
        // Note: In a production environment, this might be better handled by a cloud function or a batch update
        const unreadMessages = await tablesDB.listRows(DB_ID, MSG_TABLE, [
            Query.equal('conversationId', conversationId),
            Query.notContains('readBy', userId),
            Query.limit(100)
        ]);

        return Promise.all(unreadMessages.rows.map(msg => this.markAsRead(msg.$id, userId)));
    },
};
