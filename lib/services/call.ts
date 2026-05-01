import { ID, Query, Permission, Role } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { getEcosystemUrl } from '../constants';
import { sendKylrixEmailNotification } from '../email-notifications';
import { buildCallJoinUrl, createCallMetadata, isCallActive, parseCallMetadata, type KylrixCallScope } from '../sdk/calls';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const LINKS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.CALL_LINKS;
const ACTIVITY_TABLE = APPWRITE_CONFIG.TABLES.CHAT.APP_ACTIVITY;

import { account as authAccount } from '../appwrite/client';

type CallContext = {
    scope?: KylrixCallScope;
    participantIds?: string[];
    sourceApp?: 'connect' | 'note' | 'flow' | 'vault';
    noteId?: string;
    huddleId?: string;
    isPrivate?: boolean;
    allowGuests?: boolean;
};

export const CallService = {
    async createAnonymousSession() {
        try {
            return await authAccount.createAnonymousSession();
        } catch (_e) {
            console.error('Failed to create anonymous session');
            throw _e;
        }
    },

    async createCallLink(userId: string, type: 'audio' | 'video' = 'video', conversationId?: string, title?: string, startsAt?: string, durationMinutes: number = 120, context: CallContext = {}) {
        try {
            // Default to starting now if not provided
            const startTime = startsAt ? new Date(startsAt) : null;
            // Expire based on duration (default 2 hours)
            const expiresAt = new Date((startTime?.getTime() || Date.now()) + durationMinutes * 60 * 1000).toISOString();
            const scope = context.scope || (conversationId ? 'direct' : 'link');
            const participantIds = context.participantIds || [];

            // Create the row with the new concise structure
            const payload: any = {
                userId,
                type,
                expiresAt,
                createdAt: new Date().toISOString(),
                metadata: createCallMetadata({
                    scope,
                    hostId: userId,
                    title: title || undefined,
                    sourceApp: context.sourceApp || 'connect',
                    conversationId,
                    noteId: context.noteId,
                    huddleId: context.huddleId,
                    participantIds,
                    isPrivate: context.isPrivate ?? false,
                    allowGuests: context.allowGuests ?? true,
                    startsAt: startTime?.toISOString() || null,
                    expiresAt,
                })
            };

            if (startTime) payload.startsAt = startTime.toISOString();

            if (title) payload.title = title;

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
        } catch (_e) {
            console.error('[CallService] createCallLink failed');
            throw _e;
        }
    },

    async getCallLink(id: string) {
        try {
            const link = await tablesDB.getRow(DB_ID, LINKS_TABLE, id) as any;
            const now = new Date();
            const meta = parseCallMetadata(link.metadata);
            const startsAt = link.startsAt ? new Date(link.startsAt) : (meta.startsAt ? new Date(meta.startsAt) : new Date(link.$createdAt));
            const expiresAt = link.expiresAt ? new Date(link.expiresAt) : (meta.expiresAt ? new Date(meta.expiresAt) : new Date(startsAt.getTime() + 3 * 60 * 60 * 1000));
            
            if (now > expiresAt) {
                return { ...link, metadata: meta, isExpired: true, isScheduled: false };
            }
            
            if (now < startsAt) {
                return { ...link, metadata: meta, isExpired: false, isScheduled: true };
            }
            
            return { ...link, metadata: meta, isExpired: false, isScheduled: false };
        } catch (_e) {
            console.error('Failed to get call link:', _e);
            return null;
        }
    },

    async getCallLinkByCode(_code: string) {
        return this.getCallLink(_code);
    },

    async cleanupOldCallLogs() {
        try {
            const cleanupUrl = `${getEcosystemUrl('accounts')}/api/connect/calls/cleanup`;
            const response = await fetch(cleanupUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: null }),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const data = await response.json().catch(() => ({ deleted: 0 }));
            return Number(data.deleted || 0);
        } catch (_e) {
            console.error('Failed to cleanup old calls:', _e);
            return 0;
        }
    },

    _activityDocId: null as string | null,

    /**
     * Send a signal via Realtime by updating the user's AppActivity document.
     */
    async sendSignal(senderId: string, targetId: string, signal: any) {
        const payload = JSON.stringify({
            ...signal,
            sender: senderId,
            target: targetId,
            ts: Date.now()
        });

        console.log(`[CallService] Sending signal ${signal.type} from ${senderId} to ${targetId}`);

        try {
            // We always fetch the latest activity doc ID for the sender to ensure we update the right one
            const existing = await tablesDB.listRows(DB_ID, ACTIVITY_TABLE, [
                Query.equal('userId', senderId),
                Query.orderDesc('$updatedAt'),
                Query.limit(1)
            ]);

            if (existing.total > 0) {
                const docId = existing.rows[0].$id;
                return await tablesDB.updateRow(DB_ID, ACTIVITY_TABLE, docId, {
                    customStatus: payload,
                    status: 'online'
                });
            } else {
                const newDoc = await tablesDB.createRow(DB_ID, ACTIVITY_TABLE, ID.unique(), {
                    userId: senderId,
                    customStatus: payload,
                    status: 'online'
                });
                return newDoc;
            }
        } catch (_e) {
            console.error('Signal dispatch failed');
            throw _e;
        }
    },

    async startCall(callerId: string, receiverId?: string, conversationId?: string, type: 'audio' | 'video' = 'video') {
        // Direct calls are now also stored in the 'calls' table
        const payload: any = {
            userId: callerId,
            type,
            expiresAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(), // Default 2 hours
            createdAt: new Date().toISOString()
        };

        if (receiverId || conversationId) {
            payload.metadata = createCallMetadata({
                scope: (conversationId || receiverId) ? 'direct' : 'link',
                hostId: callerId,
                sourceApp: 'connect',
                conversationId,
                participantIds: receiverId ? [callerId, receiverId] : [callerId],
                allowGuests: false,
                startsAt: new Date().toISOString(),
                expiresAt: payload.expiresAt,
            });
        }

        const call = await tablesDB.createRow(DB_ID, LINKS_TABLE, ID.unique(), payload, [
            Permission.read(Role.any()),
            Permission.update(Role.user(callerId)),
            Permission.delete(Role.user(callerId)),
        ]);

        if (receiverId) {
            sendKylrixEmailNotification({
                eventType: 'call_started',
                sourceApp: 'connect',
                actorName: callerId,
                recipientIds: [receiverId],
                resourceId: call.$id,
                resourceTitle: type === 'audio' ? 'Audio call' : 'Video call',
                resourceType: 'call',
                templateKey: `connect:call-started:${conversationId || receiverId}`,
                ctaUrl: buildCallJoinUrl(getEcosystemUrl('connect'), call.$id),
                ctaText: 'Join call',
            }).catch((error) => {
                console.error('[CallService] Failed to queue call email', error);
            });
        }

        return call;
    },

    async updateCallStatus(callId: string, status: 'completed' | 'declined' | 'missed', _duration: number = 0) {
        try {
            const call = await tablesDB.getRow(DB_ID, LINKS_TABLE, callId);
            const meta = parseCallMetadata(call.metadata);

            return await tablesDB.updateRow(DB_ID, LINKS_TABLE, callId, {
                metadata: JSON.stringify({ ...meta, status }),
                expiresAt: new Date().toISOString() // End the call immediately
            });
        } catch (_e) {
            console.error('Failed to update call status');
        }
    },

    async cleanupCall(callId: string) {
        try {
            const response = await fetch(`${getEcosystemUrl('accounts')}/api/connect/calls/cleanup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ callId }),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }
        } catch (_e) {
            console.error('Failed to cleanup call:', _e);
        }
    },

    async cleanupLink(linkId: string) {
        return this.cleanupCall(linkId);
    },

    async getCallHistory(userId: string) {
        // Fetch calls where user is creator OR receiver (stored in metadata)
        const [asCreator, asReceiver] = await Promise.all([
            tablesDB.listRows(DB_ID, LINKS_TABLE, [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(20)]),
            tablesDB.listRows(DB_ID, LINKS_TABLE, [Query.contains('metadata', userId), Query.orderDesc('$createdAt'), Query.limit(20)])
        ]);
        
        const allRows = [...asCreator.rows, ...asReceiver.rows].map(row => {
            const meta = parseCallMetadata(row.metadata);
            const receiverId = meta.participantIds?.find((id) => id !== row.userId) || null;
            const status = meta.status || (isCallActive(row) ? 'ongoing' : 'completed');

            return {
                ...row,
                callerId: row.userId,
                receiverId,
                status,
                startedAt: row.startsAt || row.$createdAt,
                isLink: meta.scope === 'link' || meta.scope === 'note' || meta.scope === 'huddle',
                metadata: meta,
            };
        });

        return allRows.sort((a: any, b: any) => 
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
    },

    async getActiveCalls(userId: string) {
        const history = await this.getCallHistory(userId);
        return history.filter((c: any) => c.status === 'ongoing' && new Date(c.expiresAt) > new Date());
    },

    async endCall(callId: string) {
        return this.updateCallStatus(callId, 'completed');
    },

    async getActiveParticipants(callId: string) {
        try {
            const res = await tablesDB.listRows(DB_ID, ACTIVITY_TABLE, [
                Query.equal('status', 'online'),
                Query.limit(100)
            ]);
            
            return res.rows.filter(row => {
                try {
                    if (!row.customStatus) return false;
                    const status = JSON.parse(row.customStatus);
                    return status.callId === callId || status.conversationId === callId || status.callCode === callId;
                } catch (_e) {
                    return false;
                }
            });
        } catch (_e) {
            return [];
        }
    },

    async deleteCallLog(callId: string) {
        return this.cleanupCall(callId);
    }
};
