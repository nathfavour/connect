import { ID, Query } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const CONV_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS;
const MSG_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MESSAGES;

export const ChatService = {
    async getConversations(userId: string) {
        return await tablesDB.listRows(DB_ID, CONV_TABLE, [
            Query.search('participants', userId),
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

    async deleteMessage(messageId: string) {
        return await tablesDB.deleteRow(DB_ID, MSG_TABLE, messageId);
    },

    async markAsRead(conversationId: string, userId: string) {
        // This would typically update a 'readBy' array in the message or a separate 'ReadReceipts' table.
        // For now, we can assume a 'readBy' field in the message if we want per-message status,
        // or a 'lastRead' timestamp in a 'ConversationParticipants' table if we had one.
        // Given the current schema, we might not have a direct way without modifying schema.
        // Let's skip implementation but expose the method signature for future.
        console.log('markAsRead not fully implemented in schema');
        return true;
    },

    async getMessages(conversationId: string, limit = 50, offset = 0) {
        return await tablesDB.listRows(DB_ID, MSG_TABLE, [
            Query.equal('conversationId', conversationId),
            Query.orderDesc('createdAt'),
            Query.limit(limit),
            Query.offset(offset)
        ]);
    },

    async sendMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call_signal' = 'text', attachments: string[] = []) {
        const now = new Date().toISOString();
        
        // 1. Create Message
        const message = await tablesDB.createRow(DB_ID, MSG_TABLE, ID.unique(), {
            conversationId,
            senderId,
            content,
            type,
            attachments,
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
