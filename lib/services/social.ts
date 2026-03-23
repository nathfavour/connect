import { ID, Query } from 'appwrite';
import { tablesDB, realtime, storage } from '../appwrite/client';
import { UsersService } from './users';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const MOMENTS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.MOMENTS;
const FOLLOWS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.FOLLOWS;
const INTERACTIONS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.INTERACTIONS;

export interface MomentMetadata {
    type: 'post' | 'reply' | 'pulse' | 'quote';
    sourceId?: string; // For replies, pulses, and quotes
    attachments?: {
        type: 'note' | 'event' | 'image' | 'video' | 'call';
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
                    if (!m.fileId) return;
                    const meta = JSON.parse(m.fileId);
                    if (meta.sourceId === momentId) {
                        if (meta.type === 'reply') replies++;
                        if (meta.type === 'pulse') pulses++;
                    }
            } catch (_e) {}
        });

        return { likes, replies, pulses };
        } catch (_e) {
            return { likes: 0, replies: 0, pulses: 0 };
        }
    },

    // Lightweight helpers to list interactions or pulses without bloat
    async _listInteractionsFor(momentId: string, emoji: string) {
        try {
            const rows = await tablesDB.listRows(DB_ID, INTERACTIONS_TABLE, [
                Query.equal('messageId', momentId),
                Query.equal('emoji', emoji),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            // return minimal footprint
            return rows.rows.map((r: any) => ({ userId: r.userId, createdAt: r.createdAt || r.$createdAt }));
        } catch (e) {
            console.error('_listInteractionsFor error', e);
            return [];
        }
    },

    async _listPulsesFor(sourceId: string) {
        try {
            // We must scan recent moments and filter pulses referencing sourceId
            const moments = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, [
                Query.orderDesc('$createdAt'),
                Query.limit(200)
            ]);

            return moments.rows.filter((m: any) => {
                try {
                    if (!m.fileId) return false;
                    const meta = JSON.parse(m.fileId);
                    return meta.type === 'pulse' && meta.sourceId === sourceId;
                } catch (_e) { return false; }
            }).map((m: any) => ({ userId: m.userId || m.creatorId, createdAt: m.$createdAt || m.createdAt }));
        } catch (e) {
            console.error('_listPulsesFor error', e);
            return [];
        }
    },

    async isPulsed(userId: string, sourceId: string) {
        try {
            const pulses = await this._listPulsesFor(sourceId);
            return pulses.some((p: any) => p.userId === userId);
        } catch (e) {
            console.error('isPulsed error', e);
            return false;
        }
    },

    async toggleLike(userId: string, momentId: string, creatorId?: string, contentSnippet?: string) {
    try {
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
                            details: JSON.stringify({
                                read: false,
                                originalDetails: `Someone liked your post: ${contentSnippet || '...'}` ,
                                actionUrl: `https://connect.${process.env.NEXT_PUBLIC_DOMAIN || 'kylrix.space'}/post/${momentId}`
                            })
                        }
                    );
                } catch (_logErr) {
                    console.warn('Failed to log like to activityLog');
                }
            }

            return { liked: true };
        }
    } catch (error) {
        console.error('toggleLike error:', error);
        throw error;
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
        } catch (_e) {
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
            try {
                enriched.isPulsed = await this.isPulsed(currentUserId, moment.$id);
            } catch (_e) {
                enriched.isPulsed = false;
            }
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
                        APPWRITE_CONFIG.TABLES.KYLRIXNOTE.USERS === '67ff05c900247b5673d3' ? '67ff05f3002502ef239e' : 'notes',
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
                } else if (att.type === 'call') {
                    const call = await tablesDB.getRow(
                        APPWRITE_CONFIG.DATABASES.CHAT,
                        APPWRITE_CONFIG.TABLES.CHAT.CALL_LINKS,
                        att.id
                    );
                    enriched.attachedCall = call;
                } else if (att.type === 'image' || att.type === 'video') {
                    // For now, we just keep the IDs in enriched.attachments
                    if (!enriched.attachments) enriched.attachments = [];
                    enriched.attachments.push(att);
                }
            } catch (_e) {
                console.warn(`Failed to resolve attachment ${att.type}:${att.id}`, _e);
            }
        }));

        // Resolve Source Moment (for Pulse/Quote/Reply)
        if (metadata?.sourceId) {
            try {
                const source = await this.getMomentById(metadata.sourceId);
                enriched.sourceMoment = source;
            } catch (_e) {
                console.warn(`Failed to resolve source moment ${metadata.sourceId}`, _e);
            }
        }

        return enriched;
    },

    async getFeed(userId?: string, targetUserId?: string) {
        // Fetch public moments or moments from followed users
        const queries = [
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ];

        if (targetUserId) {
            queries.push(Query.equal('userId', targetUserId));
        }

        const moments = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, queries);

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
            // If we are looking at a specific user's feed, show their replies too
            if (targetUserId && m.userId === targetUserId) return true;

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
            return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
        });

        return { ...moments, rows: sortedRows.slice(0, 50), total: sortedRows.length };
    },

    async getTrendingFeed(userId?: string) {
        const feed = await this.getFeed(userId);
        // Simply sort by rank score exclusively for trending
        const trendingRows = [...feed.rows].sort((a, b) => (b._rankScore || 0) - (a._rankScore || 0));
        return { ...feed, rows: trendingRows };
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
            const unsubMoments = await unsubMomentsPromise as any;
            const unsubInteractions = await unsubInteractionsPromise as any;

            if (typeof unsubMoments === 'function') unsubMoments();
            else if (unsubMoments?.unsubscribe) unsubMoments.unsubscribe();
            
            if (typeof unsubInteractions === 'function') unsubInteractions();
            else if (unsubInteractions?.unsubscribe) unsubInteractions.unsubscribe();
        };
    },

    async uploadMedia(file: File) {
        try {
            const uploaded = await storage.createFile(
                APPWRITE_CONFIG.BUCKETS.MESSAGES, // Using messages bucket as it exists and is likely generic
                ID.unique(),
                file
            );
            return uploaded.$id;
        } catch (_e) {
            console.error('Failed to upload media', _e);
            throw _e;
        }
    },

    getMediaPreview(fileId: string, width: number = 800, height: number = 600) {
        return storage.getFilePreview(APPWRITE_CONFIG.BUCKETS.MESSAGES, fileId, width, height).toString();
    },

    async createMoment(creatorId: string, content: string, type: 'post' | 'reply' | 'pulse' | 'quote' = 'post', mediaIds: string[] = [], visibility: 'public' | 'private' | 'followers' = 'public', noteId?: string, eventId?: string, sourceId?: string, callId?: string) {
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
        if (callId) metadata.attachments.push({ type: 'call', id: callId });

        const effectiveFileId = JSON.stringify(metadata);

        // Prevent duplicate pulses: if this is a pulse and the user already has a pulse
        // for the same sourceId, return the existing moment instead of creating another.
        if (type === 'pulse' && sourceId) {
            try {
                const recent = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, [
                    Query.equal('userId', creatorId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(200)
                ]);

                const existingPulse = recent.rows.find((m: any) => {
                    try {
                        if (!m.fileId) return false;
                        const meta = JSON.parse(m.fileId);
                        return meta.type === 'pulse' && meta.sourceId === sourceId;
                    } catch (_e) { return false; }
                });

                if (existingPulse) {
                    // Already pulsed by this user; return the existing row to dedupe at the service layer.
                    return existingPulse;
                }
            } catch (dedupeErr) {
                console.warn('pulse dedupe check failed', dedupeErr);
                // Fall through and attempt to create the moment if the check fails
            }
        }

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
            let targetUserId = creatorId;
            if (type === 'reply' || type === 'pulse' || type === 'quote') {
                try {
                    const sourceMoment = await tablesDB.getRow(DB_ID, MOMENTS_TABLE, sourceId!);
                    targetUserId = sourceMoment.userId;
                } catch (sourceErr) {
                    console.warn('Failed to fetch source moment for activity log', sourceErr);
                }
            }

            await tablesDB.createRow(
                APPWRITE_CONFIG.DATABASES.KYLRIXNOTE, 
                APPWRITE_CONFIG.TABLES.KYLRIXNOTE.ACTIVITY_LOG, 
                ID.unique(), 
                {
                    userId: targetUserId,
                    action: type === 'post' ? 'Post Created' : type === 'reply' ? 'Moment Replied' : type === 'pulse' ? 'Moment Pulsed' : 'Moment Quoted',
                    targetType: 'moment',
                    targetId: moment.$id,
                    details: JSON.stringify({
                        read: targetUserId === creatorId, // Auto-read if it's our own action
                        originalDetails: type === 'post' ? `New post shared: ${content.substring(0, 50)}...` : 
                            type === 'reply' ? `Someone replied to your post: ${content.substring(0, 50)}...` :
                            type === 'pulse' ? `Someone pulsed your post` : `Someone quoted your post`,
                        actionUrl: `https://connect.${process.env.NEXT_PUBLIC_DOMAIN || 'kylrix.space'}/post/${moment.$id}`
                    })
                }
            );
        } catch (_logErr) {
            console.warn('Failed to log moment action to activityLog');
        }

        return moment;
    },

    async deleteMoment(momentId: string) {
        return await tablesDB.deleteRow(DB_ID, MOMENTS_TABLE, momentId);
    },

    async unpulseMoment(userId: string, sourceId: string) {
        const existing = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, [
            Query.equal('userId', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ]);

        const pulseToDelete = existing.rows.find((m: any) => {
            try {
                const meta = JSON.parse(m.fileId);
                return meta.type === 'pulse' && meta.sourceId === sourceId;
            } catch (_e) { return false; }
        });

        if (pulseToDelete) {
            await this.deleteMoment(pulseToDelete.$id);
            return true;
        }
        return false;
    },

    async updateMomentVisibility(momentId: string, visibility: 'public' | 'private' | 'followers') {
        return await tablesDB.updateRow(DB_ID, MOMENTS_TABLE, momentId, { visibility });
    },

    async updateMoment(momentId: string, content: string) {
        return await tablesDB.updateRow(DB_ID, MOMENTS_TABLE, momentId, {
            caption: content,
            updatedAt: new Date().toISOString()
        });
    },

    async likeMoment(userId: string, momentId: string) {
        return await tablesDB.createRow(DB_ID, INTERACTIONS_TABLE, ID.unique(), {
            userId,
            momentId,
            type: 'like'
        });
    },

    async followUser(followerId: string, followingId: string) {
        // Prevent duplicate follow rows: check if a follow already exists
        try {
            const existing = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                Query.equal('followerId', followerId),
                Query.equal('followingId', followingId),
                Query.limit(1)
            ]);

            if (existing.total > 0) {
                // Already following
                return existing.rows[0];
            }

            return await tablesDB.createRow(DB_ID, FOLLOWS_TABLE, ID.unique(), {
                followerId,
                followingId,
                status: 'accepted',
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('[SocialService] followUser error', err);
            throw err;
        }
    },

    async unfollowUser(followerId: string, followingId: string) {
        try {
            const existing = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                Query.equal('followerId', followerId),
                Query.equal('followingId', followingId),
                Query.limit(100)
            ]);

            if (existing.total > 0) {
                // Remove all matching follow relationships to avoid stale duplicates
                for (const row of existing.rows) {
                    try { await tablesDB.deleteRow(DB_ID, FOLLOWS_TABLE, row.$id); } catch (_e) {}
                }
                return true;
            }
            return false;
        } catch (err) {
            console.error('[SocialService] unfollowUser error', err);
            throw err;
        }
    },

    async isFollowing(followerId: string, followingId: string) {
        try {
            // Direct check
            const existing = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                Query.equal('followerId', followerId),
                Query.equal('followingId', followingId),
                Query.limit(1)
            ]);
            if (existing.total > 0) return true;

            // Fallback: some entries historically mixed document ids vs userIds.
            // Resolve the target profile and check by its document id.
            try {
                const profileRow = await UsersService.getProfileById(followingId);
                if (profileRow && profileRow.$id && profileRow.$id !== followingId) {
                    const alt = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                        Query.equal('followerId', followerId),
                        Query.equal('followingId', profileRow.$id),
                        Query.limit(1)
                    ]);
                    if (alt.total > 0) return true;
                }
            } catch (_e) {
                // ignore
            }

            // Also try resolving the follower side (maybe followerId was stored as profile doc id)
            try {
                const followerProfile = await UsersService.getProfileById(followerId);
                if (followerProfile && followerProfile.$id && followerProfile.$id !== followerId) {
                    const alt2 = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                        Query.equal('followerId', followerProfile.$id),
                        Query.equal('followingId', followingId),
                        Query.limit(1)
                    ]);
                    if (alt2.total > 0) return true;

                    if (profileRow && profileRow.$id) {
                        const alt3 = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                            Query.equal('followerId', followerProfile.$id),
                            Query.equal('followingId', profileRow.$id),
                            Query.limit(1)
                        ]);
                        if (alt3.total > 0) return true;
                    }
                }
            } catch (_e) {
                // ignore
            }

            return false;
        } catch (e) {
            console.error('[SocialService] isFollowing error', e);
            return false;
        }
    },

    async getFollowStats(userId: string) {
        try {
            // Count all follower relations where followingId == userId
            const followers = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                Query.equal('followingId', userId),
                Query.limit(1000)
            ]);
            // Count all following relations where followerId == userId
            const following = await tablesDB.listRows(DB_ID, FOLLOWS_TABLE, [
                Query.equal('followerId', userId),
                Query.limit(1000)
            ]);

            return {
                followers: followers.total,
                following: following.total,
                followerRows: followers.rows,
                followingRows: following.rows
            };
        } catch (_e) {
            return { followers: 0, following: 0 };
        }
    },

    async searchMoments(query: string, userId?: string) {
        try {
            const queries = [
                Query.contains('caption', query),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ];

            const moments = await tablesDB.listRows(DB_ID, MOMENTS_TABLE, queries);
            
            // Enrich search results
            const enrichedRows = await Promise.all(moments.rows.map(async (moment: any) => {
                return this.enrichMoment(moment, userId);
            }));

            return { ...moments, rows: enrichedRows };
        } catch (error) {
            console.error('searchMoments error:', error);
            return { rows: [], total: 0 };
        }
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
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ]);

        const replies = await Promise.all(
            moments.rows
                .filter((m: any) => {
                    try {
                        const meta = JSON.parse(m.fileId);
                        return meta.sourceId === momentId && meta.type === 'reply';
                    } catch (_e) { return false; }
                })
                .map(m => this.enrichMoment(m, currentUserId))
        );

        return replies;
    }
};
