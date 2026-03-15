import { ID, Query } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { ecosystemSecurity } from '../ecosystem/security';


const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const CONV_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS;
const MSG_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MESSAGES;

export const ChatService = {
    /**
     * Internal: Wraps a symmetric conversation key for a list of participants.
     * Uses X25519 public keys from the identities table.
     */
    async _wrapConversationKey(convKey: CryptoKey, participants: string[]) {
        const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
        const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;

        const wrappedKeys: Record<string, string> = {};

        // Fetch public keys for all participants from the unified chat.users table
        const res = await tablesDB.listRows(CHAT_DB, USERS_TABLE, [
            Query.equal('$id', participants),
        ]);

        for (const doc of res.rows) {
            try {
                if (doc.publicKey) {
                    wrappedKeys[doc.$id] = await ecosystemSecurity.wrapKeyWithECDH(convKey, doc.publicKey);
                } else {
                    console.warn(`User ${doc.$id} does not have a publicKey published yet`);
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
            let myWrappedKey = keyMap[myUserId];

            // If we don't have a wrapped key, but we have a valid identity, we might need a re-wrap
            // This happens after a Master Password reset where the user has a new public key.
            if (!myWrappedKey) {
                console.warn(`No wrapped key found for user ${myUserId} in conversation ${conv.$id}. Re-wrap required.`);
                return null;
            }

            // We need the creator's public key (the one who wrapped it) to do ECDH
            const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
            const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;

            try {
                const creatorDoc = await tablesDB.getRow(CHAT_DB, USERS_TABLE, conv.creatorId);
                const creatorPubKey = creatorDoc?.publicKey;
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
        const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;

        const res = await tablesDB.listRows(CHAT_DB, USERS_TABLE, [
            Query.equal('$id', participants),
        ]);

        let updated = false;
        for (const doc of res.rows) {
            if (doc.publicKey) {
                // Check if the key needs updating (either missing or creator rotated)
                // For simplicity, we re-wrap if it's missing or if we are the creator and want to ensure everyone is synced
                if (!currentKeyMap[doc.$id]) {
                    try {
                        currentKeyMap[doc.$id] = await ecosystemSecurity.wrapKeyWithECDH(convKey, doc.publicKey);
                        updated = true;
                    } catch (e) {
                        console.error(`Failed to re-wrap key for user ${doc.$id}`, e);
                    }
                }
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
        return await this._decryptConversation(conv, userId);
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
        const res = await tablesDB.listRows(DB_ID, CONV_TABLE, [
            Query.contains('participants', userId),
            Query.orderDesc('lastMessageAt')
        ]);

        res.rows = await Promise.all(res.rows.map(c => this._decryptConversation(c, userId)));
        return res;
    },

    async createConversation(participants: string[], type: 'direct' | 'group' = 'direct', name?: string) {
        const creatorId = participants[0];
        const isSelf = type === 'direct' && participants.length === 1 && participants[0] === participants[participants.length - 1];
        const uniqueParticipants = isSelf ? [participants[0], participants[0]] : Array.from(new Set(participants));

        // GUARD: Prevent duplicate self-chats by checking server-side first
        if (isSelf) {
            const existing = await tablesDB.listRows(DB_ID, CONV_TABLE, [
                Query.contains('participants', creatorId),
                Query.equal('type', 'direct'),
                Query.limit(50)
            ]);
            const existingSelf = existing.rows.find((c: any) =>
                c.participants && (c.participants.length === 1 || c.participants.length === 2) &&
                c.participants.every((p: string) => p === creatorId)
            );
            if (existingSelf) {
                console.log('[ChatService] Self-chat already exists, returning existing:', existingSelf.$id);
                return existingSelf;
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

        const now = new Date().toISOString();

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
        });

        // Cache the local key for this session
        if (convKey) {
            ecosystemSecurity.setConversationKey(newConv.$id, convKey);
        }

        return newConv;
    },

    async sendMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call_signal' | 'system' = 'text', attachments: string[] = [], replyTo?: string) {
        const now = new Date().toISOString();

        // E2E Layer: Universal Handshake Protocol
        // Messages are encrypted using the unique Group/Session Key!
        let finalContent = content;
        if (type === 'text' && ecosystemSecurity.status.isUnlocked) {
            const convKey = ecosystemSecurity.getConversationKey(conversationId);
            if (convKey) {
                finalContent = await ecosystemSecurity.encryptWithKey(content, convKey);
            } else {
                // Warning fallback if keys failed to sync in session
                finalContent = await ecosystemSecurity.encrypt(content);
            }
        }

        // 1. Create Message
        const message = await tablesDB.createRow(DB_ID, MSG_TABLE, ID.unique(), {
            conversationId,
            senderId,
            content: finalContent,
            type,
            attachments,
            replyTo,
            readBy: [senderId],
            createdAt: now,
            updatedAt: now
        });

        // 2. Update Conversation Last Message (with encrypted snippet)
        await tablesDB.updateRow(DB_ID, CONV_TABLE, conversationId, {
            lastMessageId: message.$id,
            lastMessageAt: now,
            lastMessageText: type === 'text' ? finalContent : `[${type}]`,
            updatedAt: now
        });

        // 3. (Background) If this is a group, check if any participant needs re-keying
        // This ensures a reset participant can receive future messages
        if (ecosystemSecurity.status.isUnlocked) {
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
            if (msg.type === 'text' && msg.content && msg.content.length > 40 && ecosystemSecurity.status.isUnlocked) {
                try {
                    if (convKey) {
                        msg.content = await ecosystemSecurity.decryptWithKey(msg.content, convKey);
                    } else {
                        msg.content = await ecosystemSecurity.decrypt(msg.content);
                    }
                } catch (_e: unknown) {
                    try {
                        // Fallback attempt for legacy MasterPass encrypted messages in older DMs
                        msg.content = await ecosystemSecurity.decrypt(msg.content);
                    } catch (_fallbackE) {
                        msg.content = "[Encrypted Message]";
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
            ...data,
            updatedAt: new Date().toISOString()
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
            ...data,
            updatedAt: new Date().toISOString()
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
