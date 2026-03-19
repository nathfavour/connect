import { ID, Query, Permission, Role } from 'appwrite';
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

    async createCallLink(userId: string, type: 'audio' | 'video' = 'video', conversationId?: string, title?: string, startsAt?: string, durationMinutes: number = 120) {
        try {
            // Default to starting now if not provided
            const startTime = startsAt ? new Date(startsAt) : new Date();
            // Expire based on duration (default 2 hours)
            const expiresAt = new Date(startTime.getTime() + durationMinutes * 60 * 1000).toISOString();

            // Create the row with the new concise structure
            const payload: any = {
                userId,
                type,
                expiresAt,
                startsAt: startTime.toISOString()
            };

            if (title) payload.title = title;
            if (conversationId) payload.metadata = JSON.stringify({ conversationId });

            console.log('[CallService] Creating call in new table with payload:', payload);

            return await tablesDB.createRow(
                DB_ID,
                LINKS_TABLE,
                ID.unique(),
                payload,
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.user(userId)),
                    Permission.delete(Role.user(userId)),
                ]
            );
        } catch (e) {
            console.error('[CallService] createCallLink failed:', e);
            throw e;
        }
    },

    async getCallLink(id: string) {
        try {
            const link = await tablesDB.getRow(DB_ID, LINKS_TABLE, id) as any;
            const now = new Date();
            const startsAt = link.startsAt ? new Date(link.startsAt) : new Date(link.$createdAt);
            const expiresAt = link.expiresAt ? new Date(link.expiresAt) : new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
            
            if (now > expiresAt) {
                return { ...link, isExpired: true, isScheduled: false };
            }
            
            if (now < startsAt) {
                return { ...link, isExpired: false, isScheduled: true };
            }
            
            return { ...link, isExpired: false, isScheduled: false };
        } catch (e) {
            console.error('Failed to get call link:', e);
            return null;
        }
    },

    async getCallLinkByCode(code: string) {
        // This method is now redundant as we use Row ID, but keeping it as a no-op 
        // or removing it if no longer called.
        return null;
    },

    async cleanupOldCallLogs() {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const oldLogs = await tablesDB.listRows(DB_ID, LOGS_TABLE, [
                Query.lessThan('startedAt', sevenDaysAgo),
                Query.limit(100)
            ]);

            for (const log of oldLogs.rows) {
                await tablesDB.deleteRow(DB_ID, LOGS_TABLE, log.$id);
            }
            return oldLogs.total;
        } catch (e) {
            console.error('Failed to cleanup old call logs:', e);
            return 0;
        }
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
    },

    async getCallHistory(userId: string) {
        // Fetch calls where user is caller OR receiver OR creator (for links)
        // Note: Using $createdAt (Appwrite internal) for sorting instead of non-existent createdAt
        const [asCaller, asReceiver, asCreator] = await Promise.all([
            tablesDB.listRows(DB_ID, LOGS_TABLE, [Query.equal('callerId', userId), Query.orderDesc('startedAt'), Query.limit(20)]),
            tablesDB.listRows(DB_ID, LOGS_TABLE, [Query.equal('receiverId', userId), Query.orderDesc('startedAt'), Query.limit(20)]),
            tablesDB.listRows(DB_ID, LINKS_TABLE, [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(20)])
        ]);
        
        // Convert links to log-like objects for the UI
        const linkLogs = asCreator.rows.map(link => {
            let conversationId = undefined;
            try {
                if (link.metadata) {
                    const meta = JSON.parse(link.metadata);
                    conversationId = meta.conversationId;
                }
            } catch (e) {}

            return {
                ...link,
                callerId: link.userId,
                receiverId: null,
                conversationId,
                status: new Date(link.expiresAt) < new Date() ? 'completed' : 'ongoing',
                startedAt: link.startsAt || link.$createdAt,
                isLink: true
            };
        });

        const allCalls = [...asCaller.rows, ...asReceiver.rows, ...linkLogs].sort((a: any, b: any) => 
            new Date(b.startedAt || b.$createdAt).getTime() - new Date(a.startedAt || a.$createdAt).getTime()
        );
        
        return allCalls;
    },

    async getActiveCalls(userId: string) {
        // Fetch ongoing calls where user is participant OR active links
        const [asCaller, asReceiver, asCreator] = await Promise.all([
            tablesDB.listRows(DB_ID, LOGS_TABLE, [Query.equal('callerId', userId), Query.equal('status', 'ongoing')]),
            tablesDB.listRows(DB_ID, LOGS_TABLE, [Query.equal('receiverId', userId), Query.equal('status', 'ongoing')]),
            tablesDB.listRows(DB_ID, LINKS_TABLE, [Query.equal('userId', userId), Query.greaterThan('expiresAt', new Date().toISOString())])
        ]);
        
        const linkLogs = asCreator.rows.map(link => {
            let conversationId = undefined;
            try {
                if (link.metadata) {
                    const meta = JSON.parse(link.metadata);
                    conversationId = meta.conversationId;
                }
            } catch (e) {}

            return {
                ...link,
                callerId: link.userId,
                receiverId: null,
                conversationId,
                status: 'ongoing',
                startedAt: link.startsAt || link.$createdAt,
                isLink: true
            };
        });

        return [...asCaller.rows, ...asReceiver.rows, ...linkLogs];
    },

    async endCall(callId: string) {
        return await tablesDB.updateRow(DB_ID, LOGS_TABLE, callId, {
            status: 'completed',
            updatedAt: new Date().toISOString()
        });
    },

    async getActiveParticipants(callId: string) {
        try {
            // We use AppActivity to see who is currently 'online' and has this callId in their customStatus
            const res = await tablesDB.listRows(DB_ID, ACTIVITY_TABLE, [
                Query.equal('status', 'online'),
                Query.limit(100)
            ]);
            
            return res.rows.filter(row => {
                try {
                    if (!row.customStatus) return false;
                    const status = JSON.parse(row.customStatus);
                    return status.callId === callId || status.conversationId === callId || status.callCode === callId;
                } catch (e) {
                    return false;
                }
            });
        } catch (e) {
            return [];
        }
    },

    async deleteCallLog(callId: string) {
        try {
            // Try deleting from logs table first
            return await tablesDB.deleteRow(DB_ID, LOGS_TABLE, callId);
        } catch (e) {
            // If it fails, try deleting from links table
            return await tablesDB.deleteRow(DB_ID, LINKS_TABLE, callId);
        }
    }
};
