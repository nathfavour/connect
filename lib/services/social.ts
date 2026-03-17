import { ID, Query } from 'appwrite';
import { tablesDB, realtime } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const MOMENTS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MOMENTS;
const FOLLOWS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.FOLLOWS;
const INTERACTIONS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.INTERACTIONS;

export interface MomentMetadata {
    type: 'post' | 'reply' | 'pulse' | 'quote';
    sourceId?: string; // For replies, pulses, and quotes
    attachments?: {
        type: 'note' | 'event' | 'image' | 'video';
        id: string;
    }[];
}

export const SocialService = {
    async getInteractionCounts(momentId: string) {
        try {
            const interactions = await tablesDB.listRows(DB_ID, INTERACTIONS_TABLE, [
                Query.equal('messageId', momentId),
                Query.limit(100)
            ]);

            const likes = interactions.rows.filter((i: any) => i.emoji === 'like').length;
            
            // For replies and pulses, we have to look at the moments table
            // This is slightly inefficient but works for now
            const moments = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, [
                Query.limit(100)
            ]);

            let replies = 0;
            let pulses = 0;

            moments.rows.forEach((m: any) => {
                try {
                    const meta = JSON.parse(m.fileId);
                    if (meta.sourceId === momentId) {
                        if (meta.type === 'reply') replies++;
                        if (meta.type === 'pulse') pulses++;
                    }
                } catch (e) {}
            });

            return { likes, replies, pulses };
        } catch (e) {
            return { likes: 0, replies: 0, pulses: 0 };
        }
    },

    async toggleLike(userId: string, momentId: string, creatorId?: string, contentSnippet?: string) {
        const existing = await tablesDB.listRows(DB_ID, INTERACTIONS_TABLE, [
            Query.equal('userId', userId),
            Query.equal('messageId', momentId),
            Query.equal('emoji', 'like')
        ]);

        if (existing.total > 0) {
            await tablesDB.deleteRow(DB_ID, INTERACTIONS_TABLE, existing.rows[0].$id);
            return { liked: false };
        } else {
            await tablesDB.createRow(DB_ID, INTERACTIONS_TABLE, ID.unique(), {
                userId,
                messageId: momentId,
                emoji: 'like',
                createdAt: new Date().toISOString()
            });

            // Record in Activity Log for Notifications (if not our own post)
            if (creatorId && creatorId !== userId) {
                try {
                    await tablesDB.createRow(
                        APPWRITE_CONFIG.DATABASES.KYLRIXNOTE, 
                        APPWRITE_CONFIG.TABLES.KYLRIXNOTE.ACTIVITY_LOG, 
                        ID.unique(), 
                        {
                            userId: creatorId,
                            action: 'Moment Liked',
                            targetType: 'moment',
                            targetId: momentId,
                            timestamp: new Date().toISOString(),
                            details: JSON.stringify({
                                read: false,
                                originalDetails: `Someone liked your post: ${contentSnippet || '...'}` ,
                                actionUrl: `https://connect.${process.env.NEXT_PUBLIC_DOMAIN || 'kylrix.space'}/post/${momentId}`
                            })
                        }
                    );
                } catch (logErr) {
                    console.warn('Failed to log like to activityLog', logErr);
                }
            }

            return { liked: true };
        }
    },

    async isLiked(userId: string, momentId: string) {
        const existing = await tablesDB.listRows(DB_ID, INTERACTIONS_TABLE, [
            Query.equal('userId', userId),
            Query.equal('messageId', momentId),
            Query.equal('emoji', 'like')
        ]);
        return existing.total > 0;
    },

    async enrichMoment(moment: any, currentUserId?: string) {
        let metadata: MomentMetadata | null = null;
        
        // Attempt to parse metadata from fileId
        try {
            if (moment.fileId && (moment.fileId.startsWith('{') || moment.fileId.startsWith('['))) {
                metadata = JSON.parse(moment.fileId);
            }
        } catch (e) {
            // Not JSON, handle as legacy
        }

        const enriched = { 
            ...moment, 
            metadata, 
            stats: { likes: 0, replies: 0, pulses: 0 },
            isLiked: false
        };

        // Fetch counts
        const counts = await this.getInteractionCounts(moment.$id);
        enriched.stats = counts;

        if (currentUserId) {
            enriched.isLiked = await this.isLiked(currentUserId, moment.$id);
        }

        // Handle Legacy & New Metadata Attachments
        const attachments = metadata?.attachments || [];
        
        // If legacy, synthesize an attachment for the enrichment loop
        if (!metadata && moment.fileId && moment.fileId !== 'none') {
            if (moment.fileId.startsWith('note:')) {
                attachments.push({ type: 'note', id: moment.fileId.replace('note:', '') });
            } else if (moment.fileId.startsWith('event:')) {
                attachments.push({ type: 'event', id: moment.fileId.replace('event:', '') });
            }
        }

        // Resolve attachments
        await Promise.all(attachments.map(async (att) => {
            try {
                if (att.type === 'note') {
                    const note = await tablesDB.getRow(
                        APPWRITE_CONFIG.DATABASES.KYLRIXNOTE,
                        '67ff05f3002502ef239e',
                        att.id
                    );
                    enriched.attachedNote = note;
                } else if (att.type === 'event') {
                    const event = await tablesDB.getRow(
                        APPWRITE_CONFIG.DATABASES.KYLRIXFLOW,
                        'events',
                        att.id
                    );
                    enriched.attachedEvent = event;
                } else if (att.type === 'image' || att.type === 'video') {
                    // For now, we just keep the IDs in enriched.attachments
                    if (!enriched.attachments) enriched.attachments = [];
                    enriched.attachments.push(att);
                }
            } catch (e) {
                console.warn(`Failed to resolve attachment ${att.type}:${att.id}`, e);
            }
        }));

        // Resolve Source Moment (for Pulse/Quote/Reply)
        if (metadata?.sourceId) {
            try {
                const source = await tablesDB.getRow(DB_ID, MOMENTS_TABLE, metadata.sourceId);
                enriched.sourceMoment = await this.enrichMoment(source);
            } catch (e) {
                console.warn(`Failed to resolve source moment ${metadata.sourceId}`, e);
            }
        }

        return enriched;
    },

    async getFeed(userId?: string) {
        // Fetch public moments or moments from followed users
        const moments = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, [
            Query.orderDesc('createdAt'),
            Query.limit(100)
        ]);

        // Enrich moments
        const enrichedRows = await Promise.all(moments.rows.map(async (moment: any) => {
            return this.enrichMoment(moment, userId);
        }));

        // Algorithmic Feed Ranking Logic
        // Weights: Post (1.0), Quote (1.0), Pulse/Repost (0.75), Reply (0.5)
        // High engagement (likes/replies) can boost lower-weight types into the feed
        const rankedRows = enrichedRows.map((m: any) => {
            let baseWeight = 1.0;
            const type = m.metadata?.type || 'post';

            if (type === 'pulse') baseWeight = 0.75;
            if (type === 'reply') baseWeight = 0.5;
            
            // Engagement Boost: Each like/reply adds to the "importance" score
            const engagementScore = (m.stats?.likes || 0) * 0.2 + (m.stats?.replies || 0) * 0.4;
            const finalScore = baseWeight + engagementScore;

            return { ...m, _rankScore: finalScore };
        });

        // Filter: Only show replies if they have significant engagement (score > 1.0)
        // This ensures "high value" comments show up tied to their threads in the feed
        const filteredRows = rankedRows.filter((m: any) => {
            if (m.metadata?.type === 'reply') {
                return m._rankScore > 1.0; 
            }
            return true;
        });

        // Sort by final score then by date
        const sortedRows = filteredRows.sort((a, b) => {
            if (Math.abs(b._rankScore - a._rankScore) > 0.1) {
                return b._rankScore - a._rankScore;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return { ...moments, rows: sortedRows.slice(0, 50), total: sortedRows.length };
    },

    subscribeToFeed(callback: (event: { type: 'create' | 'update' | 'delete', payload: any }) => void) {
        const momentsChannel = `databases.${DB_ID}.collections.${MOMENTS_TABLE}.documents`;
        const interactionsChannel = `databases.${DB_ID}.collections.${INTERACTIONS_TABLE}.documents`;

        const unsubMomentsPromise = realtime.subscribe(momentsChannel, (response) => {
            const payload = response.payload;
            let type: 'create' | 'update' | 'delete' | null = null;

            if (response.events.some(e => e.includes('.create'))) type = 'create';
            else if (response.events.some(e => e.includes('.update'))) type = 'update';
            else if (response.events.some(e => e.includes('.delete'))) type = 'delete';

            if (type) {
                callback({ type, payload });
            }
        });

        const unsubInteractionsPromise = realtime.subscribe(interactionsChannel, (response) => {
            if (response.events.some(e => e.includes('.create') || e.includes('.delete'))) {
                const payload = response.payload as any;
                callback({ type: 'update', payload: { $id: payload.messageId, _interactionUpdate: true } });
            }
        });

        return async () => {
            const unsubMoments = await unsubMomentsPromise;
            const unsubInteractions = await unsubInteractionsPromise;

            if (typeof unsubMoments === 'function') unsubMoments();
            else if ((unsubMoments as any)?.unsubscribe) (unsubMoments as any).unsubscribe();
            
            if (typeof unsubInteractions === 'function') unsubInteractions();
            else if ((unsubInteractions as any)?.unsubscribe) (unsubInteractions as any).unsubscribe();
        };
    },

    async createMoment(creatorId: string, content: string, type: 'post' | 'reply' | 'pulse' | 'quote' = 'post', mediaIds: string[] = [], visibility: 'public' | 'private' | 'followers' = 'public', noteId?: string, eventId?: string, sourceId?: string) {
        const permissions = [
            `read("user:${creatorId}")`,
            `update("user:${creatorId}")`,
            `delete("user:${creatorId}")`,
        ];

        if (visibility === 'public') {
            permissions.push('read("any")');
        }

        // Build Metadata-based fileId
        const metadata: MomentMetadata = { type };
        if (sourceId) metadata.sourceId = sourceId;
        
        metadata.attachments = mediaIds.map(id => ({ type: 'image', id }));
        if (noteId) metadata.attachments.push({ type: 'note', id: noteId });
        if (eventId) metadata.attachments.push({ type: 'event', id: eventId });

        const effectiveFileId = JSON.stringify(metadata);

        const moment = await tablesDB.createRow(DB_ID, MOMENTS_TABLE, ID.unique(), {
            userId: creatorId, 
            caption: content,
            type: 'image', // Database schema only accepts image/video
            fileId: effectiveFileId, 
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
        }, permissions);

        // Record in Activity Log for Ecosystem Notifications
        try {
            const isSelf = type === 'post'; // Pure posts are usually announcements
            const targetUserId = (type === 'reply' || type === 'pulse' || type === 'quote') ? 
                (await tablesDB.getRow(DB_ID, MOMENTS_TABLE, sourceId!)).userId : creatorId;

            await tablesDB.createRow(
                APPWRITE_CONFIG.DATABASES.KYLRIXNOTE, 
                APPWRITE_CONFIG.TABLES.KYLRIXNOTE.ACTIVITY_LOG, 
                ID.unique(), 
                {
                    userId: targetUserId,
                    action: type === 'post' ? 'Post Created' : type === 'reply' ? 'Moment Replied' : type === 'pulse' ? 'Moment Pulsed' : 'Moment Quoted',
                    targetType: 'moment',
                    targetId: moment.$id,
                    timestamp: new Date().toISOString(),
                    details: JSON.stringify({
                        read: targetUserId === creatorId, // Auto-read if it's our own action
                        originalDetails: type === 'post' ? `New post shared: ${content.substring(0, 50)}...` : 
                            type === 'reply' ? `Someone replied to your post: ${content.substring(0, 50)}...` :
                            type === 'pulse' ? `Someone pulsed your post` : `Someone quoted your post`,
                        actionUrl: `https://connect.${process.env.NEXT_PUBLIC_DOMAIN || 'kylrix.space'}/post/${moment.$id}`
                    })
                }
            );
        } catch (logErr) {
            console.warn('Failed to log moment action to activityLog', logErr);
        }

        return moment;
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
    },

    async getMomentById(momentId: string, currentUserId?: string) {
        const moment = await tablesDB.getRow(DB_ID, MOMENTS_TABLE, momentId);
        return this.enrichMoment(moment, currentUserId);
    },

    async getReplies(momentId: string, currentUserId?: string) {
        // Find moments where sourceId matches the current ID
        // Note: Currently, sourceId is buried in a JSON string (fileId).
        // Standard Appwrite queries won't find this.
        // Optimization: Use a dedicated 'sourceId' string field in the DB.
        // Fallback: Fetch latest and filter client-side (until we add sourceId field)
        const moments = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, [
            Query.orderDesc('createdAt'),
            Query.limit(100)
        ]);

        const replies = await Promise.all(
            moments.rows
                .filter((m: any) => {
                    try {
                        const meta = JSON.parse(m.fileId);
                        return meta.sourceId === momentId && meta.type === 'reply';
                    } catch (e) { return false; }
                })
                .map(m => this.enrichMoment(m, currentUserId))
        );

        return replies;
    }
};
