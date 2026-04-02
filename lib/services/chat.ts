import { ID, Permission, Query, Role } from 'appwrite';
import { account, tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { getEcosystemUrl } from '../constants';
import { ecosystemSecurity } from '../ecosystem/security';
import { UsersService } from './users';


const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const CONV_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS;
const MSG_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MESSAGES;
const ACCOUNTS_API_URL = `${getEcosystemUrl('accounts')}/api/permissions`;
const participantIdCache = new Map<string, string>();

const arraysEqual = (left: string[], right: string[]) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const canonicalizeParticipantsForMatch = (participants: string[]) =>
    Array.from(new Set((participants || []).filter(Boolean))).sort();

const hasSharedReadAccess = (row: any) =>
    Array.isArray(row?.$permissions) && row.$permissions.some((permission: string) =>
        permission === 'read("users")' || permission === 'read("any")'
    );

const getConversationActivityAt = (row: any) =>
    row?.lastMessageAt || row?.updatedAt || row?.createdAt || row?.$updatedAt || row?.$createdAt || null;

const getMessageActivityAt = (row: any) =>
    row?.createdAt || row?.updatedAt || row?.$createdAt || row?.$updatedAt || null;

const buildMessagePermissions = (senderId: string) => [
    Permission.read(Role.user(senderId)),
    Permission.update(Role.user(senderId)),
    Permission.delete(Role.user(senderId))
];

const syncMessagePermissions = async (
    rowId: string,
    recipientIds: string[],
    permission: 'read' | 'write' | 'admin' = 'read',
    auth?: { jwt?: string; cookie?: string }
) => {
    const targets = Array.from(new Set(recipientIds.filter(Boolean)));
    if (!rowId || targets.length === 0) return;

    let jwt: string | null = auth?.jwt || null;
    if (!jwt && !auth?.cookie) {
        try {
            const session = await account.createJWT();
            jwt = session?.jwt || null;
        } catch (_err) {
            jwt = null;
        }
    }

    if (!jwt && !auth?.cookie) {
        throw new Error('Unable to authenticate permission update request');
    }

    const response = await fetch(ACCOUNTS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            ...(auth?.cookie ? { Cookie: auth.cookie } : {}),
        },
        body: JSON.stringify({
            databaseId: APPWRITE_CONFIG.DATABASES.CHAT,
            tableId: MSG_TABLE,
            rowId,
            targetUserIds: targets,
            permission,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update message permissions');
    }
};

const resolveParticipantId = async (participantId: string) => {
    if (!participantId) return participantId;
    const cached = participantIdCache.get(participantId);
    if (cached) return cached;

    try {
        const profile = await UsersService.getProfileById(participantId);
        const resolved = profile?.userId || participantId;

        participantIdCache.set(participantId, resolved);
        if (profile?.$id) participantIdCache.set(profile.$id, resolved);
        if (profile?.userId) participantIdCache.set(profile.userId, resolved);

        return resolved;
    } catch (_e) {
        participantIdCache.set(participantId, participantId);
        return participantId;
    }
};

const normalizeConversationRow = async (conversation: any) => {
    if (!conversation) return conversation;

    const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
    const normalizedParticipants = await Promise.all(participants.map((participantId: string) => resolveParticipantId(participantId)));
    const creatorId = conversation.creatorId ? await resolveParticipantId(conversation.creatorId) : conversation.creatorId;

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

export const ChatService = {
    /**
     * Internal: Wraps a symmetric conversation key for a list of participants.
     * Uses X25519 public keys from the identities table.
     */
    async _wrapConversationKey(convKey: CryptoKey, participants: string[]) {
        const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
        const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.PROFILES;

        const wrappedKeys: Record<string, string> = {};

        // Fetch public keys for all participants from the unified profiles table
        const res = await tablesDB.listRows(CHAT_DB, USERS_TABLE, [
            Query.equal('userId', participants),
        ]);

        for (const doc of res.rows) {
            try {
                if (doc.publicKey && doc.userId) {
                    wrappedKeys[doc.userId] = await ecosystemSecurity.wrapKeyWithECDH(convKey, doc.publicKey);
                } else {
                    console.warn(`User ${doc.userId || doc.$id} does not have a publicKey published yet`);
                }
            } catch (e: unknown) {
                console.error('Failed to wrap key for user:', doc.userId, e);
            }
        }
        return JSON.stringify(wrappedKeys);
    },

    async _unwrapConversationKey(conv: any, myUserId: string): Promise<CryptoKey | null> {
        let key = ecosystemSecurity.getConversationKey(conv.$id);
        if (key) return key;

        if (!conv.encryptionKey) return null;

        try {
            const keyMap = JSON.parse(conv.encryptionKey);
            const myWrappedKey = keyMap[myUserId];

            // If we don't have a wrapped key, but we have a valid identity, we might need a re-wrap
            // This happens after a Master Password reset where the user has a new public key.
            if (!myWrappedKey) {
                console.warn(`No wrapped key found for user ${myUserId} in conversation ${conv.$id}. Re-wrap required.`);
                return null;
            }

            // We need the creator's public key (the one who wrapped it) to do ECDH
            const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
            const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.PROFILES;

            try {
                const creatorRes = await tablesDB.listRows(CHAT_DB, USERS_TABLE, [
                    Query.equal('userId', conv.creatorId),
                    Query.limit(1)
                ]);
                const creatorPubKey = creatorRes.rows[0]?.publicKey;
                if (!creatorPubKey) throw new Error("Creator public key not found");

                key = await ecosystemSecurity.unwrapKeyWithECDH(myWrappedKey, creatorPubKey);
                if (key) {
                    ecosystemSecurity.setConversationKey(conv.$id, key);
                }
            } catch (_e) {
                // If unwrapping fails, it might be because the creator rotated their key too
                // or we are using a new identity that doesn't match this wrapped key.
                console.error("Could not unwrap key with creator's public key", _e);
                throw new Error("Could not retrieve creator public key or decryption failed");
            }
            return key;
        } catch (_e) {
            console.error("Failed to unwrap conversation key", _e);
            return null;
        }
    },

    /**
     * Re-wraps the conversation key for participants who are missing it.
     * This is crucial for maintaining group access after a participant resets their identity.
     */
    async rewrapConversationKeys(conversationId: string) {
        if (!ecosystemSecurity.status.isUnlocked) return;

        const convKey = ecosystemSecurity.getConversationKey(conversationId);
        if (!convKey) return; // We need the key to wrap it!

        const conv = await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
        const participants = conv.participants || [];
        const currentKeyMap = JSON.parse(conv.encryptionKey || '{}');

        // Fetch all current public keys
        const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
        const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.PROFILES;

        const res = await tablesDB.listRows(CHAT_DB, USERS_TABLE, [
            Query.equal('userId', participants),
        ]);

        let updated = false;
        for (const doc of res.rows) {
            if (!doc.publicKey || !doc.userId) continue;

            try {
                const freshWrap = await ecosystemSecurity.wrapKeyWithECDH(convKey, doc.publicKey);
                if (currentKeyMap[doc.userId] !== freshWrap) {
                    currentKeyMap[doc.userId] = freshWrap;
                    updated = true;
                }
            } catch (e) {
                console.error(`Failed to re-wrap key for user ${doc.$id}`, e);
            }
        }

        if (updated) {
            await tablesDB.updateRow(DB_ID, CONV_TABLE, conversationId, {
                encryptionKey: JSON.stringify(currentKeyMap)
            });
        }
    },
    async getConversationById(conversationId: string, userId?: string) {
        const conv = await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
        const normalizedConversation = await normalizeConversationRow(conv);
        return await this._decryptConversation(normalizedConversation, userId);
    },

    async _decryptConversation(conv: any, userId?: string) {
        if (!conv.isEncrypted || !ecosystemSecurity.status.isUnlocked) return conv;
        try {
            let convKey: CryptoKey | null = null;
            if (userId) {
                convKey = await this._unwrapConversationKey(conv, userId);
            } else {
                convKey = ecosystemSecurity.getConversationKey(conv.$id);
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

            // Fallback for legacy MasterPass encryption
            if (conv.name && conv.name.length > 40) {
                conv.name = await ecosystemSecurity.decrypt(conv.name);
            }
            if (conv.lastMessageText && conv.lastMessageText.length > 40) {
                conv.lastMessageText = await ecosystemSecurity.decrypt(conv.lastMessageText);
            }
        } catch (_e: unknown) {
            // Might not be encrypted or key missing
        }
        return conv;
    },

    async getConversations(userId: string) {
        console.log('[ChatService] getConversations for:', userId);

        const conversationMap = new Map<string, any>();

        // 1. Standard fetch of existing conversations
        const res = await tablesDB.listRows(DB_ID, CONV_TABLE, [
            Query.contains('participants', userId),
            Query.limit(100)
        ]);
        res.rows.forEach((conversation: any) => conversationMap.set(conversation.$id, conversation));

        // 2. Proactive Scan: recent messages can reveal conversations that were created
        // with legacy participant IDs or whose metadata was never updated after the first send.
        let recentMessages: any[] = [];
        try {
            const recentMessagesResult = await tablesDB.listRows(DB_ID, MSG_TABLE, [
                Query.orderDesc('createdAt'),
                Query.limit(100)
            ]);
            recentMessages = recentMessagesResult.rows;

            const missingConversationIds = new Set<string>();
            recentMessages.forEach((message: any) => {
                if (message.conversationId && !conversationMap.has(message.conversationId)) {
                    missingConversationIds.add(message.conversationId);
                }
            });

            if (missingConversationIds.size > 0) {
                console.log('[ChatService] Found messages for potential missing conversations:', Array.from(missingConversationIds));
                const potentialConvs = await Promise.all(
                    Array.from(missingConversationIds).map(id => tablesDB.getRow(DB_ID, CONV_TABLE, id).catch(() => null))
                );

                potentialConvs.forEach(conversation => {
                    if (conversation?.$id) {
                        conversationMap.set(conversation.$id, conversation);
                    }
                });
            }
        } catch (_scanErr) {
            console.warn('[ChatService] Proactive message scan failed');
        }

        let rows = await Promise.all(Array.from(conversationMap.values()).map((conversation: any) => normalizeConversationRow(conversation)));
        rows = rows.filter((conversation: any) => conversation?.participants?.includes(userId));

        const latestMessageByConversation = new Map<string, any>();
        recentMessages.forEach((message: any) => {
            if (message?.conversationId && !latestMessageByConversation.has(message.conversationId)) {
                latestMessageByConversation.set(message.conversationId, message);
            }
        });

        rows = await Promise.all(rows.map(async (conversation: any) => {
            const latestMessage = latestMessageByConversation.get(conversation.$id);
            const hydratedConversation = latestMessage ? {
                ...conversation,
                lastMessageAt: getMessageActivityAt(latestMessage) || conversation.lastMessageAt,
                lastMessageText: await getMessagePreview(latestMessage, conversation.$id)
            } : conversation;

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
        const now = new Date().toISOString();
        const creatorId = participants[0];
        const isSelf = type === 'direct' && participants.length === 1 && participants[0] === participants[participants.length - 1];
        const uniqueParticipants = isSelf ? [participants[0], participants[0]] : Array.from(new Set(participants));

        // GUARD: Prevent duplicate direct chats by checking server-side first
        if (type === 'direct') {
            const existing = await tablesDB.listRows(DB_ID, CONV_TABLE, [
                Query.contains('participants', creatorId),
                Query.equal('type', 'direct'),
                Query.limit(100)
            ]);

            const targetParticipantSet = canonicalizeParticipantsForMatch(uniqueParticipants);
            for (const conversation of existing.rows) {
                const normalizedConversation = await normalizeConversationRow(conversation);
                const existingParticipantSet = canonicalizeParticipantsForMatch(normalizedConversation?.participants || []);

                if (arraysEqual(existingParticipantSet, targetParticipantSet)) {
                    if (hasSharedReadAccess(normalizedConversation)) {
                        console.log('[ChatService] Direct chat already exists, returning existing:', normalizedConversation.$id);
                        return normalizedConversation;
                    }

                    console.warn('[ChatService] Found legacy direct chat without shared read access, creating a replacement conversation');
                }
            }
        }

        let encryptionKeyMap: string | undefined;
        let convKey: CryptoKey | null = null;

        // E2E Layer: Only if vault is unlocked and identity is ready
        if (ecosystemSecurity.status.isUnlocked && ecosystemSecurity.status.hasIdentity) {
            // 1. Generate unique Group/Conversation Key
            convKey = await ecosystemSecurity.generateConversationKey();

            // 2. Wrap specifically for each participant
            encryptionKeyMap = await this._wrapConversationKey(convKey, uniqueParticipants);
        }

        // 3. Encrypt name and metadata if it's a group
        let encryptedName = name;
        if (name && convKey && ecosystemSecurity.status.isUnlocked) {
            encryptedName = await ecosystemSecurity.encryptWithKey(name, convKey);
        }

        const conversationPermissions = [
            Permission.read(Role.users()),
            Permission.update(Role.user(creatorId)),
            Permission.delete(Role.user(creatorId))
        ];

        const newConv = await tablesDB.createRow(DB_ID, CONV_TABLE, ID.unique(), {
            participants: uniqueParticipants,
            participantCount: uniqueParticipants.length,
            type: type || 'direct',
            name: encryptedName || 'Direct Chat',
            creatorId,
            admins: [],
            isPinned: [],
            isMuted: [],
            isArchived: [],
            tags: [],
            isEncrypted: !!encryptionKeyMap,
            encryptionKey: encryptionKeyMap || '',
            encryptionVersion: '1.0',
            createdAt: now,
            updatedAt: now
        }, conversationPermissions);

        // Cache the local key for this session
        if (convKey) {
            ecosystemSecurity.setConversationKey(newConv.$id, convKey);
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
        const now = new Date().toISOString();
        let conversation: any = null;

        // E2E Layer: Universal Handshake Protocol
        let finalContent = content;
        let finalMetadata = metadata;

        if ((type === 'text' || type === 'attachment') && ecosystemSecurity.status.isUnlocked) {
            const convKey = ecosystemSecurity.getConversationKey(conversationId);
            if (convKey) {
                finalContent = await ecosystemSecurity.encryptWithKey(content, convKey);
                if (metadata) {
                    const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
                    finalMetadata = await ecosystemSecurity.encryptWithKey(metaStr, convKey);
                }
            } else {
                finalContent = await ecosystemSecurity.encrypt(content);
                if (metadata) {
                    const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
                    finalMetadata = await ecosystemSecurity.encrypt(metaStr);
                }
            }
        }

        try {
            const rawConversation = await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
            conversation = await normalizeConversationRow(rawConversation);
        } catch (_e) {
            conversation = null;
        }

        if (conversation?.participants?.length && !conversation.participants.includes(senderId)) {
            throw new Error('You are not a participant in this conversation');
        }

        const permissions = buildMessagePermissions(senderId);

        // 1. Create Message with explicit permissions
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
            updatedAt: now
        }, permissions);

        const recipientIds = Array.isArray(conversation?.participants)
            ? conversation.participants.filter((participantId: string) => participantId && participantId !== senderId)
            : [];

        if (recipientIds.length > 0) {
            await syncMessagePermissions(message.$id, recipientIds, 'read', permissionSyncAuth);
        }

        // 2. Best-effort conversation preview update.
        // In a client-only model only the creator can mutate the shared row, so list UIs must
        // derive freshness from message activity instead of depending on this always succeeding.
        if (conversation?.creatorId === senderId) {
            try {
                await tablesDB.updateRow(DB_ID, CONV_TABLE, conversationId, {
                    lastMessageId: message.$id,
                    lastMessageAt: now,
                    lastMessageText: type === 'text' ? finalContent : `[${type}]`,
                    updatedAt: now
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
        const convKey = ecosystemSecurity.getConversationKey(conversationId);

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
                try {
                    const decrypt = async (val: string) => {
                        if (convKey) return await ecosystemSecurity.decryptWithKey(val, convKey);
                        return await ecosystemSecurity.decrypt(val);
                    };

                    if (msg.type === 'text' && msg.content && msg.content.length > 40) {
                        msg.content = await decrypt(msg.content);
                    }
                    if (msg.metadata && msg.metadata.length > 40) {
                        const decryptedMeta = await decrypt(msg.metadata);
                        try {
                            msg.metadata = JSON.parse(decryptedMeta);
                        } catch {
                            msg.metadata = decryptedMeta;
                        }
                    }
                } catch (_e: unknown) {
                    try {
                        // Fallback attempt for legacy MasterPass encrypted messages in older DMs
                        if (msg.type === 'text' && msg.content && msg.content.length > 40) {
                            msg.content = await ecosystemSecurity.decrypt(msg.content);
                        }
                        if (msg.metadata && msg.metadata.length > 40) {
                            const decryptedMeta = await ecosystemSecurity.decrypt(msg.metadata);
                            try {
                                msg.metadata = JSON.parse(decryptedMeta);
                            } catch {
                                msg.metadata = decryptedMeta;
                            }
                        }
                    } catch (_fallbackE) {
                        if (msg.type === 'text') msg.content = "[Encrypted Message]";
                        if (msg.metadata) msg.metadata = null;
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
            return await this.updateConversation(conversationId, {
                participants: [...participants, userId]
            });
        }
        return conv;
    },

    async removeParticipant(conversationId: string, userId: string) {
        const conv = await this.getConversationById(conversationId);
        const participants = (conv.participants || []).filter((id: string) => id !== userId);
        const admins = (conv.admins || []).filter((id: string) => id !== userId);
        return await this.updateConversation(conversationId, {
            participants,
            admins
        });
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
