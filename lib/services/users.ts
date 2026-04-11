import { Query, Permission, Role } from 'appwrite';
import { tablesDB, storage, getCurrentUser } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { getEcosystemUrl } from '../constants';
import {
    resolveIdentityById,
    resolveIdentityByUsername,
    seedIdentityCache,
    normalizeIdentity,
} from '@/lib/identity-cache';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.PROFILES;
const PROFILE_SYNC_TTL = 5000;
const profileSyncRequests = new Map<string, Promise<any | null>>();
const profileSyncCache = new Map<string, { value: any | null; syncedAt: number }>();

const normalizeUsername = (input: string | null | undefined): string | null => {
    if (!input) return null;
    const cleaned = input
        .toString()
        .trim()
        .replace(/^@+/, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');
    return cleaned || null;
};

const deriveAutomaticIdentity = (user: { $id: string; email?: string; name?: string }) => {
    const nameParts = user.name ? user.name.trim().split(/\s+/).filter(Boolean) : [];
    const firstName = nameParts[0] || '';
    const surname = nameParts[1] || '';
    const emailPrefix = user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') : '';

    return {
        candidates: Array.from(new Set([
            normalizeUsername(firstName),
            normalizeUsername(surname),
            normalizeUsername(emailPrefix),
            normalizeUsername(`u${user.$id.slice(0, 12)}`),
        ].filter(Boolean))) as string[],
        displayName: nameParts.length >= 2
            ? `${nameParts[0]} ${nameParts[1]}`
            : firstName || emailPrefix || `User ${user.$id.slice(0, 6)}`,
    };
};

const buildFallbackUsername = (userId: string, email?: string | null) => {
    const emailPrefix = email ? normalizeUsername(email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '')) : null;
    if (emailPrefix) return emailPrefix;
    return normalizeUsername(`u${userId.slice(0, 12)}`) || `u${userId.slice(0, 12)}`;
};

const buildProfilePayload = (
    userId: string,
    profile: any | null,
    seed?: { email?: string; name?: string; prefs?: Record<string, any>; publicKey?: string | null }
) => {
    const derived = deriveAutomaticIdentity({ $id: userId, email: seed?.email, name: seed?.name });
    const username = profile?.username || derived.candidates[0] || buildFallbackUsername(userId, seed?.email);
    const displayName = profile?.displayName || seed?.name || derived.displayName;
    return {
        userId,
        username,
        displayName,
        bio: profile?.bio || '',
        avatar: profile?.avatar || null,
        publicKey: seed?.publicKey ?? profile?.publicKey ?? null,
        walletAddress: profile?.walletAddress || null,
        preferences: profile?.preferences || null,
    };
};

const resolveRecentSync = (userId: string) => {
    const cached = profileSyncCache.get(userId);
    if (!cached) return null;
    if (Date.now() - cached.syncedAt > PROFILE_SYNC_TTL) {
        profileSyncCache.delete(userId);
        return null;
    }
    return cached.value;
};

const rememberRecentSync = (userId: string, value: any | null) => {
    profileSyncCache.set(userId, { value, syncedAt: Date.now() });
    return value;
};

const dedupeProfileSync = async (userId: string, task: () => Promise<any | null>) => {
    const recent = resolveRecentSync(userId);
    if (recent) return recent;

    const active = profileSyncRequests.get(userId);
    if (active) return active;

    const request = (async () => {
        try {
            const value = await task();
            return rememberRecentSync(userId, value);
        } finally {
            profileSyncRequests.delete(userId);
        }
    })();

    profileSyncRequests.set(userId, request);
    return request;
};

async function syncProfileEvent(payload: {
    type: 'username_change' | 'profile_sync';
    userId: string;
    newUsername?: string | null;
    profilePatch?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}) {
    try {
        const res = await fetch(`${getEcosystemUrl('accounts')}/api/account-events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to sync profile event');
        return data;
    } catch (error) {
        console.warn('[UsersService] Failed to sync profile event:', error);
        return null;
    }
}

export const UsersService = {
    /**
     * Get profile from the global Chat directory by username.
     */
    async getProfile(username: string) {
        const normalized = normalizeUsername(username);
        if (!normalized) return null;
        try {
            return await resolveIdentityByUsername(normalized, async () => {
                const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                    Query.equal('username', normalized),
                    Query.limit(1),
                    Query.select(['$id', 'userId', 'username', 'displayName', 'bio', 'avatar', 'publicKey', 'walletAddress', 'preferences', 'tier', 'last_username_edit', 'createdAt', '$createdAt'])
                ]);
                return result.rows[0] || null;
            });
        } catch (_e: unknown) {
            return null;
        }
    },

    /**
     * Get profile from the global Chat directory by User ID.
     * This is the primary lookup for the feed.
     * If multiple profiles are found, they are all purged to heal the state.
     */
    async getProfileById(userId: string, skipCache = false) {
        if (!userId) return null;

        const fetcher = async () => {
            // Priority 1: Direct ID lookup (Fastest, most reliable, bypasses index lag)
            // We use userId as the document ID ($id) for all modern profiles.
            try {
                const doc = await tablesDB.getRow(DB_ID, USERS_TABLE, userId);
                if (doc) return doc;
            } catch (_e) {
                // Not found by ID
            }

            // Priority 2: Fallback to querying by userId field (Handles legacy rows where $id was random)
            try {
                const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                    Query.equal('userId', userId),
                    Query.limit(1),
                    Query.select(['$id', 'userId', 'username', 'displayName', 'bio', 'avatar', 'publicKey', 'walletAddress', 'preferences', 'tier', 'last_username_edit', 'createdAt', '$createdAt'])
                ]);

                if (result.rows[0]) return result.rows[0];
            } catch (_e) {
                // Query failed
            }

            return null;
        };

        if (skipCache) {
            return await fetcher();
        }

        try {
            return await resolveIdentityById(userId, fetcher);
        } catch (_e: unknown) {
            return null;
        }
    },

    /**
     * Deletes all profiles associated with a specific User ID.
     * Used for healing corrupted state.
     */
    async purgeAllProfilesForUser(userId: string) {
        try {
            const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                Query.equal('userId', userId),
                Query.limit(100),
                Query.select(['$id', 'userId', 'username', 'displayName', 'bio', 'avatar', 'publicKey', 'walletAddress', 'preferences', 'tier', 'last_username_edit', 'createdAt', '$createdAt'])
            ]);
            
            for (const row of result.rows) {
                await tablesDB.deleteRow(DB_ID, USERS_TABLE, row.$id);
            }
            console.log(`[UsersService] Purged ${result.total} profiles for user ${userId}`);
        } catch (err) {
            console.error(`[UsersService] Failed to purge profiles for user ${userId}:`, err);
        }
    },

    async isUsernameAvailable(username: string) {
        const normalized = normalizeUsername(username);
        if (!normalized) return false;
        try {
            const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                Query.equal('username', normalized),
                Query.select(['$id', 'userId', 'username', 'displayName', 'bio', 'avatar', 'publicKey', 'walletAddress', 'preferences', 'tier', 'last_username_edit', 'createdAt', '$createdAt'])
            ]);
            return result.total === 0;
        } catch (_e: unknown) {
            return true; // Assume available on error to avoid blocking
        }
    },

    async updateProfile(userId: string, data: { username?: string; displayName?: string; bio?: string; avatar?: string; publicKey?: string; walletAddress?: string | null; preferences?: string | null }): Promise<any> {
        // Try to find by userId first (as expected)
        let currentProfile = await this.getProfileById(userId);

        // Robustness: If not found by userId, check if the passed ID was actually a document ID
        if (!currentProfile) {
            try {
                const doc = await tablesDB.getRow(DB_ID, USERS_TABLE, userId);
                if (doc) currentProfile = normalizeIdentity(doc);
            } catch (_e) {
                // Not a document ID either
            }
        }

        const updatePayload: any = {};
        const allowedFields = ['userId', 'username', 'displayName', 'bio', 'avatar', 'publicKey', 'walletAddress', 'preferences'];

        if (data.username) {
            const normalized = normalizeUsername(data.username);
            if (!normalized) throw new Error('Invalid username');

            // Only check availability if the username is actually changing
            if (currentProfile && normalized !== currentProfile.username) {
                const available = await this.isUsernameAvailable(normalized);
                if (!available) {
                    throw new Error('Username already taken');
                }
                updatePayload.username = normalized;

                // --- USERNAME HISTORY TRACKING ---
                try {
                    let prefs: any = {};
                    try {
                        prefs = typeof currentProfile.preferences === 'string' 
                            ? JSON.parse(currentProfile.preferences || '{}') 
                            : (currentProfile.preferences || {});
                    } catch (_e) { prefs = {}; }

                    const history = prefs.usernameHistory || [];
                    const now = new Date().toISOString();

                    if (history.length === 0) {
                        // First change: record initial and new
                        history.push({
                            initial: currentProfile.username,
                            new: normalized,
                            updatedAt: now
                        });
                    } else {
                        // Subsequent changes: just record the new one and timestamp
                        history.push({
                            new: normalized,
                            updatedAt: now
                        });
                    }

                    prefs.usernameHistory = history;
                    updatePayload.preferences = JSON.stringify(prefs);
                } catch (historyErr) {
                    console.error('[UsersService] Failed to update username history:', historyErr);
                }
            }
        }

        if (currentProfile) {
            // Use the actual userId from the profile if we found it via document ID
            const targetUserId = currentProfile.userId || userId;

            // Explicitly only allow schema fields to prevent 'Unknown attribute' errors
            allowedFields.forEach(field => {
                // Skip username as it's handled above
                if (field === 'username') return;

                if (Object.prototype.hasOwnProperty.call(data, field)) {
                    const value = (data as any)[field];
                    if (value !== undefined) {
                        updatePayload[field] = value;
                    }
                }
            });

            // Ensure userId is always present
            updatePayload.userId = targetUserId;

            // Explicitly delete ghost fields
            delete (updatePayload as any).avatarFileId;
            delete (updatePayload as any).avatarUrl;

            console.log('[UsersService] Updating profile for', targetUserId, 'with payload:', JSON.stringify(updatePayload));
            try {
                const result = await tablesDB.updateRow(DB_ID, USERS_TABLE, currentProfile.$id, updatePayload);
                seedIdentityCache(result);
                await syncProfileEvent({
                    type: Object.prototype.hasOwnProperty.call(data, 'username') ? 'username_change' : 'profile_sync',
                    userId: targetUserId,
                    newUsername: updatePayload.username as string | undefined,
                    profilePatch: {
                        username: updatePayload.username || currentProfile.username,
                        displayName: updatePayload.displayName || currentProfile.displayName,
                        bio: updatePayload.bio ?? currentProfile.bio,
                        avatar: updatePayload.avatar ?? currentProfile.avatar,
                        publicKey: updatePayload.publicKey ?? currentProfile.publicKey,
                        walletAddress: updatePayload.walletAddress ?? currentProfile.walletAddress,
                    },
                    metadata: {
                        source: 'connect.users-service.updateProfile',
                    },
                });
                return result;
            } catch (err: any) {
                console.error('[UsersService] Update failed:', err);
                throw err;
            }
        } else {
            // Should not normally happen if they are calling update, but fallback to creating
            const user = await getCurrentUser();
            if (user && user.$id === userId) {
                const ensured = await this.ensureProfileForUser(user);
                if (ensured) {
                    return await this.updateProfile(userId, data);
                }
            }
            
            console.warn('[UsersService] updateProfile called for non-existent profile and user session unavailable for', userId);
            return null;
        }
    },

    /**
     * Creates a profile in the global Chat directory.
     */
    async createProfile(
        userId: string,
        username: string,
        data: { displayName?: string; bio?: string; avatar?: string; publicKey?: string; walletAddress?: string; preferences?: string } = {}
    ) {
        const normalized = normalizeUsername(username);
        if (!normalized) throw new Error('Invalid username');

        const existing = await this.getProfileById(userId, true);
        if (existing) {
            seedIdentityCache(existing);
            return existing;
        }

        const createData: any = {
            userId,
            username: normalized,
            displayName: data.displayName || username,
            bio: data.bio || '',
            avatar: data.avatar || null,
            publicKey: data.publicKey || null,
            walletAddress: data.walletAddress || null,
            preferences: data.preferences || null,
        };

        delete (createData as any).avatarFileId;
        delete (createData as any).avatarUrl;

        console.log('[UsersService] [PAYLOAD_AUDIT] Creating with keys:', Object.keys(createData));
        console.log('[UsersService] Creating profile for', userId, 'with data:', JSON.stringify(createData));

        const row = await tablesDB.createRow(
            DB_ID,
            USERS_TABLE,
            userId,
            createData,
            [
                Permission.read(Role.any()),
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId))
            ]
        );
        seedIdentityCache(row);
        await syncProfileEvent({
            type: 'username_change',
            userId,
            newUsername: normalized,
            profilePatch: {
                username: normalized,
                displayName: createData.displayName,
                bio: createData.bio,
                publicKey: createData.publicKey,
            },
            metadata: {
                source: 'connect.users-service.createProfile',
            },
        });
        return row;
    },

    /**
     * Proactively ensures the user has a profile in the global Chat directory.
     * Triggered on every login/session check.
     */
    async ensureProfileForUser(user: { $id: string; email?: string; name?: string; prefs?: Record<string, any> }) {
        if (!user?.$id) return null;
        return dedupeProfileSync(user.$id, async () => {
            const existing = await this.getProfileById(user.$id, true);
            const { candidates, displayName } = deriveAutomaticIdentity(user);

            if (existing && existing.username) {
                const isGeneric = existing.username.startsWith('u') && existing.username.length > 5;
                const isPlaceholder = existing.username === 'user';
                
                if ((isGeneric || isPlaceholder) && candidates[0] && candidates[0] !== existing.username) {
                    console.log('[UsersService] Healing profile for', user.$id, 'to', candidates[0]);
                    return await this.updateProfile(user.$id, { 
                        username: candidates[0],
                        displayName: (displayName || existing.displayName) || undefined
                    });
                }
                seedIdentityCache(existing);
                return existing;
            }

            const avatarId = user?.prefs?.avatar || user?.prefs?.profilePicId || null;
            if (avatarId) {
                await this.setAvatarVisible(user.$id, avatarId, true);
            }

            const createData: any = {
                displayName: displayName || undefined,
                avatar: avatarId
            };

            for (const candidateUsername of candidates) {
                if (!candidateUsername) continue;
                if (!(await this.isUsernameAvailable(candidateUsername))) {
                    continue;
                }

                const created = await this.createProfile(user.$id, candidateUsername, createData);
                seedIdentityCache(created);
                return created;
            }

            const fallbackUsername = buildFallbackUsername(user.$id, user.email);
            const created = await this.createProfile(user.$id, fallbackUsername, createData);
            seedIdentityCache(created);
            return created;
        });
    },

    async syncProfileWithIdentity(user: { $id: string; email?: string; name?: string; prefs?: Record<string, any> }) {
        if (!user?.$id) return null;

        const { ecosystemSecurity } = await import('../ecosystem/security');
        if (ecosystemSecurity.status.isUnlocked) {
            return await this.forceSyncProfileWithIdentity(user);
        }

        return await this.ensureProfileForUser(user);
    },

    async forceSyncProfileWithIdentity(user: { $id: string; email?: string; name?: string; prefs?: Record<string, any> }) {
        if (!user?.$id) return null;
        return dedupeProfileSync(user.$id, async () => {
            const publicKey = await (async () => {
                try {
                    const { ecosystemSecurity } = await import('../ecosystem/security');
                    return ecosystemSecurity.status.isUnlocked ? await ecosystemSecurity.ensureE2EIdentity(user.$id) : null;
                } catch (_e) {
                    return null;
                }
            })();

            const profile = await this.getProfileById(user.$id, true);
            const payload = buildProfilePayload(user.$id, profile, {
                email: user.email,
                name: user.name,
                prefs: user.prefs,
                publicKey,
            });

            delete (payload as any).avatarFileId;
            delete (payload as any).avatarUrl;

            const permissionSet = [
                Permission.read(Role.any()),
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ];

            if (profile) {
                const updated = await tablesDB.updateRow(DB_ID, USERS_TABLE, profile.$id, payload);
                seedIdentityCache(updated);
                return updated;
            }

            const created = await tablesDB.createRow(DB_ID, USERS_TABLE, user.$id, payload, permissionSet);
            seedIdentityCache(created);
            return created;
        });
    },

    async searchUsers(query: string) {
        const cleaned = query.trim().replace(/^@/, '');
        const queries = [
            Query.or([
                Query.startsWith('username', cleaned.toLowerCase()),
                Query.startsWith('displayName', cleaned)
            ]),
            Query.limit(20)
        ];
        return await tablesDB.listRows(DB_ID, USERS_TABLE, queries);
    },

    async searchUsersWithQueries(queries: any[]) {
        return await tablesDB.listRows(DB_ID, USERS_TABLE, queries);
    },

    /**
     * Toggles global discoverability for a user's profile.
     * When enabled, anyone can find and view the profile metadata.
     */
    async setProfileDiscoverable(userId: string, isDiscoverable: boolean) {
        const profile = await this.getProfileById(userId);
        if (!profile) throw new Error('Profile not found');

        const permissions = [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
        ];

        if (isDiscoverable) {
            permissions.push(Permission.read(Role.any()));
        }

        return await tablesDB.updateRow(DB_ID, USERS_TABLE, profile.$id, {}, permissions);
    },

    /**
     * Toggles public visibility for the user's profile picture file.
     * When enabled, the file becomes accessible to Role.any() in Appwrite Storage.
     */
    async setAvatarVisible(userId: string, fileId: string, isVisible: boolean) {
        const bucketId = APPWRITE_CONFIG.BUCKETS.PROFILE_PICTURES;

        // Construct standard permissions
        const permissions = [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId))
        ];

        if (isVisible) {
            permissions.push(Permission.read(Role.any()));
        }

        // 1. Update the file permissions in Storage
        await storage.updateFile(bucketId, fileId, undefined, permissions);

        // 2. Ensure the avatar ID is saved in the user profile document
        return await this.updateProfile(userId, { avatar: fileId });
    }
};
