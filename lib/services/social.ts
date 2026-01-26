import { ID, Query, Permission, Role } from 'appwrite';
import { tablesDB, realtime } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const MOMENTS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MOMENTS;
const FOLLOWS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.FOLLOWS;
const INTERACTIONS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.INTERACTIONS;

export const SocialService = {
    async getFeed(userId?: string) {
        // Fetch public moments or moments from followed users
        const moments = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, [
            Query.orderDesc('createdAt'),
            Query.limit(50)
        ]);

        // Enrich moments with attached note data if present
        const enrichedRows = await Promise.all(moments.rows.map(async (moment: any) => {
            if (moment.caption && moment.caption.startsWith('{"text":')) {
                try {
                    const metadata = JSON.parse(moment.caption);
                    if (metadata.noteId) {
                        try {
                            const note = await tablesDB.getRow(
                                APPWRITE_CONFIG.DATABASES.WHISPERRNOTE,
                                '67ff05f3002502ef239e',
                                metadata.noteId
                            );
                            return { ...moment, attachedNote: note, caption: metadata.text || "" };
                        } catch (e) {
                            return { ...moment, caption: metadata.text || "" };
                        }
                    }
                } catch (e) {}
            }
            return moment;
        }));

        return { ...moments, rows: enrichedRows };
    },

    subscribeToFeed(callback: (event: { type: 'create' | 'update' | 'delete', payload: any }) => void) {
        const channel = `databases.${DB_ID}.collections.${MOMENTS_TABLE}.documents`;
        return realtime.subscribe(channel, (response) => {
            const payload = response.payload;
            let type: 'create' | 'update' | 'delete' | null = null;

            if (response.events.some(e => e.includes('.create'))) type = 'create';
            else if (response.events.some(e => e.includes('.update'))) type = 'update';
            else if (response.events.some(e => e.includes('.delete'))) type = 'delete';

            if (type) {
                callback({ type, payload });
            }
        });
    },

    async createMoment(creatorId: string, content: string, type: 'text' | 'image' | 'video' = 'text', mediaIds: string[] = [], visibility: 'public' | 'private' | 'followers' = 'public', noteId?: string) {
        const permissions = [
            `read("user:${creatorId}")`,
            `update("user:${creatorId}")`,
            `delete("user:${creatorId}")`,
        ];

        if (visibility === 'public') {
            permissions.push('read("any")');
        }

        let captionPayload = content;
        if (noteId) {
            captionPayload = JSON.stringify({
                text: content,
                noteId: noteId,
                noteCreatorId: creatorId
            });
        }

        return await tablesDB.createRow(DB_ID, MOMENTS_TABLE, ID.unique(), {
            userId: creatorId, 
            caption: captionPayload,
            type,
            fileId: mediaIds[0] || "none", 
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
        }, permissions);
    },

    async deleteMoment(momentId: string) {
        return await tablesDB.deleteRow(DB_ID, MOMENTS_TABLE, momentId);
    },

    async updateMomentVisibility(momentId: string, visibility: 'public' | 'private' | 'followers') {
        return await tablesDB.updateRow(DB_ID, MOMENTS_TABLE, momentId, { visibility });
    },

    async likeMoment(userId: string, momentId: string) {
        return await tablesDB.createRow(DB_ID, INTERACTIONS_TABLE, ID.unique(), {
            userId,
            momentId,
            type: 'like',
            createdAt: new Date().toISOString()
        });
    },

    async followUser(followerId: string, followingId: string) {
        return await tablesDB.createRow(DB_ID, FOLLOWS_TABLE, ID.unique(), {
            followerId,
            followingId,
            status: 'accepted',
            createdAt: new Date().toISOString()
        });
    }
};
