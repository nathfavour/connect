import { ID, Query } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const CONV_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS;
const MSG_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MESSAGES;

export const ChatService = {
    async getConversations(userId: string) {
        return await tablesDB.listRows(DB_ID, CONV_TABLE, [
            Query.contains('participants', userId),
            Query.orderDesc('lastMessageAt')
        ]);
    },

    async createConversation(participants: string[], type: 'direct' | 'group' = 'direct', name?: string) {
        // Deduplicate participants if not self-chat
        const uniqueParticipants = Array.from(new Set(participants));
        // If it was meant to be a self-chat (participants=[me, me]), Set reduces it to [me].
        // If we want to support self-chat, [me] is valid.
        
        return await tablesDB.createRow(DB_ID, CONV_TABLE, ID.unique(), {
            participants: uniqueParticipants,
            type,
            name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    },

    async getConversationById(conversationId: string) {
        return await tablesDB.getRow(DB_ID, CONV_TABLE, conversationId);
    },

    async updateConversation(conversationId: string, data: Partial<{ name: string; description: string; avatarUrl: string; participants: string[]; admins: string[] }>) {
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
        } catch (error) {
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

    async getMessages(conversationId: string, limit = 50, offset = 0) {
        return await tablesDB.listRows(DB_ID, MSG_TABLE, [
            Query.equal('conversationId', conversationId),
            Query.orderDesc('createdAt'),
            Query.limit(limit),
            Query.offset(offset)
        ]);
    },

    async sendMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call_signal' | 'system' = 'text', attachments: string[] = [], replyTo?: string) {
        const now = new Date().toISOString();
        
        // 1. Create Message
        const message = await tablesDB.createRow(DB_ID, MSG_TABLE, ID.unique(), {
            conversationId,
            senderId,
            content,
            type,
            attachments,
            replyTo,
            readBy: [senderId],
            createdAt: now,
            updatedAt: now
        });

        // 2. Update Conversation Last Message
        await tablesDB.updateRow(DB_ID, CONV_TABLE, conversationId, {
            lastMessageId: message.$id,
            lastMessageAt: now,
            updatedAt: now
        });

        return message;
    }
};
