import { ID, Query } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const LINKS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CALL_LINKS;
const LOGS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CALL_LOGS;
const ACTIVITY_TABLE = APPWRITE_CONFIG.TABLES.CHAT.APP_ACTIVITY;

import { account as authAccount } from '../appwrite/client';

export const CallService = {
    async createAnonymousSession() {
        try {
            return await authAccount.createAnonymousSession();
        } catch (e) {
            console.error('Failed to create anonymous session:', e);
            throw e;
        }
    },

    async createCallLink(userId: string, type: 'audio' | 'video' = 'video', conversationId?: string) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const domain = process.env.NEXT_PUBLIC_DOMAIN || 'kylrix.space';
        const url = `https://connect.${domain}/call/${code}`;
        
        // Expire in 24 hours by default
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        return await tablesDB.createRow(DB_ID, LINKS_TABLE, ID.unique(), {
            userId,
            conversationId,
            code,
            type,
            url,
            expiresAt
        });
    },

    async getCallLinkByCode(code: string) {
        const res = await tablesDB.listRows(DB_ID, LINKS_TABLE, [
            Query.equal('code', code),
            Query.limit(1)
        ]);
        
        if (res.total === 0) return null;
        
        const link = res.rows[0];
        if (new Date(link.expiresAt) < new Date()) {
            // Cleanup expired link
            await tablesDB.deleteRow(DB_ID, LINKS_TABLE, link.$id);
            return null;
        }
        
        return link;
    },

    /**
     * Send a signal via Realtime by updating the user's AppActivity document.
     * This is much faster than the Messages table and specifically for transient state.
     */
    async sendSignal(senderId: string, targetId: string, signal: any) {
        const payload = JSON.stringify({
            ...signal,
            sender: senderId,
            target: targetId,
            ts: Date.now()
        });

        // We use AppActivity.customStatus as a transient signaling pipe
        // The recipient subscribes to the sender's AppActivity document
        try {
            const existing = await tablesDB.listRows(DB_ID, ACTIVITY_TABLE, [
                Query.equal('userId', senderId),
                Query.limit(1)
            ]);

            if (existing.total > 0) {
                return await tablesDB.updateRow(DB_ID, ACTIVITY_TABLE, existing.rows[0].$id, {
                    customStatus: payload,
                    lastSeen: new Date().toISOString()
                });
            } else {
                return await tablesDB.createRow(DB_ID, ACTIVITY_TABLE, ID.unique(), {
                    userId: senderId,
                    customStatus: payload,
                    status: 'online',
                    lastSeen: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error('Signal dispatch failed:', e);
            throw e;
        }
    },

    async startCall(callerId: string, receiverId?: string, conversationId?: string, type: 'audio' | 'video' = 'video') {
        return await tablesDB.createRow(DB_ID, LOGS_TABLE, ID.unique(), {
            callerId,
            receiverId,
            conversationId,
            type,
            status: 'ongoing',
            startedAt: new Date().toISOString()
        });
    },

    async updateCallStatus(callId: string, status: 'completed' | 'declined' | 'missed', duration: number = 0) {
        return await tablesDB.updateRow(DB_ID, LOGS_TABLE, callId, {
            status,
            duration,
            updatedAt: new Date().toISOString()
        });
    },

    async cleanupCall(callId: string) {
        try {
            await tablesDB.deleteRow(DB_ID, LOGS_TABLE, callId);
        } catch (e) {
            console.error('Failed to cleanup call log:', e);
        }
    },

    async cleanupLink(linkId: string) {
        try {
            await tablesDB.deleteRow(DB_ID, LINKS_TABLE, linkId);
        } catch (e) {
            console.error('Failed to cleanup call link:', e);
        }
    }
};
