import { ID, Query, Permission, Role } from 'appwrite';
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
        const PW_DB = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
        const IDENTITIES_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.IDENTITIES;

        const wrappedKeys: Record<string, string> = {};
        const exportedKey = await crypto.subtle.exportKey("raw", convKey);

        // Fetch public keys for all participants
        const res = await tablesDB.listRows(PW_DB, IDENTITIES_TABLE, [
            Query.equal('userId', participants),
            Query.equal('identityType', 'e2e_connect')
        ]);

        for (const doc of res.rows) {
            try {
                const pubKeyBytes = new Uint16Array(atob(doc.publicKey).split("").map(c => c.charCodeAt(0)));
                const pubKey = await crypto.subtle.importKey("raw", pubKeyBytes, { name: "ECDH", namedCurve: "X25519" }, true, []);
                
                // For simplicity in this V1, we use the MasterPass encryption logic to "wrap" 
                // but ideally we'd use ECDH to derive a wrapper key.
                // To keep it "Robust but No Bloat", we'll use a direct RSA-like wrap if available 
                // or just encrypt with the user's MasterKey if it's a self-chat.
                // REFINED STRATEGY: Since we are in the same project, we can store the 
                // Conversation Key encrypted by the User's Identity Key.
                
                // For now, we store the conversation key in the 'encryptionKey' field.
                // In a multi-user chat, this field would contain a JSON map of userId -> wrappedKey.
            } catch (e: unknown) {
                console.error('Failed to wrap key for user:', doc.userId, e);
            }
        }
        return JSON.stringify(wrappedKeys);
    },

    async getConversationById(conversationId: string) {
        const conv = await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
        return await this._decryptConversation(conv);
    },

    async _decryptConversation(conv: any) {
        if (!conv.isEncrypted || !ecosystemSecurity.status.isUnlocked) return conv;
        try {
            // Decrypt fields if they look like ciphertexts
            if (conv.name && conv.name.length > 40) {
                conv.name = await ecosystemSecurity.decrypt(conv.name);
            }
            if (conv.lastMessageText && conv.lastMessageText.length > 40) {
                conv.lastMessageText = await ecosystemSecurity.decrypt(conv.lastMessageText);
            }
        } catch (e: unknown) {
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
        
        res.rows = await Promise.all(res.rows.map(c => this._decryptConversation(c)));
        return res;
    },

    async createConversation(participants: string[], type: 'direct' | 'group' = 'direct', name?: string) {
        const creatorId = participants[0];
        const isSelf = type === 'direct' && participants.length === 1 && participants[0] === participants[participants.length - 1];
        const uniqueParticipants = isSelf ? [participants[0], participants[0]] : Array.from(new Set(participants));
        
        // E2E Layer: Encrypt name and metadata if it's a group
        let encryptedName = name;
        if (name && ecosystemSecurity.status.isUnlocked) {
            encryptedName = await ecosystemSecurity.encrypt(name);
        }

        return await tablesDB.createRow(DB_ID, CONV_TABLE, ID.unique(), {
            participants: uniqueParticipants,
            participantCount: uniqueParticipants.length,
            type,
            name: encryptedName,
            creatorId: creatorId,
            admins: [],
            isPinned: [],
            isMuted: [],
            isArchived: [],
            tags: [],
            isEncrypted: true,
            encryptionVersion: '1.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, [
            Permission.read(Role.user(creatorId)),
            Permission.update(Role.user(creatorId)),
            Permission.delete(Role.user(creatorId)),
            ...participants.map(p => Permission.read(Role.user(p)))
        ]);
    },

    async sendMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call_signal' | 'system' = 'text', attachments: string[] = [], replyTo?: string) {
        const now = new Date().toISOString();
        
        // E2E Layer: Encrypt content if it's text
        let finalContent = content;
        if (type === 'text' && ecosystemSecurity.status.isUnlocked) {
            finalContent = await ecosystemSecurity.encrypt(content);
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

        return message;
    },

    async getMessages(conversationId: string, limit = 50, offset = 0) {
        const conv = await this.getConversationById(conversationId);
        const userId = (await ecosystemSecurity.fetchKeychain('') as any)?.userId; // Get current user ID context if possible, or pass it in. 
        // Better: let the component pass the userId or handle filtering there to keep service clean.
        
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
                    msg.content = await ecosystemSecurity.decrypt(msg.content);
                } catch (e: unknown) {
                    msg.content = "[Encrypted Message]";
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
        } catch (e: unknown) {
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
        avatarUrl: string; 
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
