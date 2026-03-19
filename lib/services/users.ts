import { ID, Query, Permission, Role } from 'appwrite';
import { tablesDB, storage, getCurrentUser } from '../appwrite/client';
import { databases as genDB } from '../../generated/appwrite';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.PROFILES;

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

export const UsersService = {
    /**
     * Get profile from the global Chat directory by username.
     */
    async getProfile(username: string) {
        const normalized = normalizeUsername(username);
        if (!normalized) return null;
        try {
            const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                Query.equal('username', normalized),
                Query.limit(1)
            ]);
            return result.rows[0] || null;
        } catch (_e: unknown) {
            return null;
        }
    },

    /**
     * Get profile from the global Chat directory by User ID.
     * This is the primary lookup for the feed.
     * If multiple profiles are found, they are all purged to heal the state.
     */
    async getProfileById(userId: string) {
        if (!userId) return null;
        try {
            const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                Query.equal('userId', userId),
                Query.limit(2) // Check if more than one exists
            ]);
            
            if (result.total > 1) {
                console.warn(`[UsersService] Duplicate profiles detected for ${userId}. Purging for state integrity.`);
                await this.purgeAllProfilesForUser(userId);
                return null;
            }
            
            return result.rows[0] || null;
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
                Query.limit(100)
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
                Query.equal('username', normalized)
            ]);
            return result.total === 0;
        } catch (_e: unknown) {
            return true; // Assume available on error to avoid blocking
        }
    },

    /**
     * Updates the global Chat directory profile.
     */
    async updateProfile(userId: string, data: { username?: string; displayName?: string; bio?: string; avatar?: string; publicKey?: string }) {
        const currentProfile = await this.getProfileById(userId);

        if (data.username) {
            const normalized = normalizeUsername(data.username);
            if (!normalized) throw new Error('Invalid username');

            const available = await this.isUsernameAvailable(normalized);
            if (!available && currentProfile?.username !== normalized) {
                throw new Error('Username already taken');
            }
            data.username = normalized;
        }

        if (currentProfile) {
            // Explicitly only allow schema fields to prevent 'Unknown attribute' errors
            const updatePayload: any = {};
            const allowedFields = ['userId', 'username', 'displayName', 'bio', 'avatar', 'publicKey'];

            allowedFields.forEach(field => {
                if (Object.prototype.hasOwnProperty.call(data, field)) {
                    const value = (data as any)[field];
                    // Skip undefined and null (unless schema allows nulls, but here we be safe)
                    if (value !== undefined) {
                        updatePayload[field] = value;
                    }
                }
            });

            // Ensure userId is always present if missing from currentProfile
            if (!currentProfile.userId) {
                updatePayload.userId = userId;
            }

            // Ensure updatedAt is always handled by Appwrite, not payload
            // updatePayload.updatedAt = new Date().toISOString();

            // Explicitly delete ghost fields that might be lingering
            delete (updatePayload as any).avatarFileId;
            delete (updatePayload as any).avatarUrl;
            delete (updatePayload as any).createdAt;
            delete (updatePayload as any).updatedAt;

            console.log('[UsersService] [PAYLOAD_AUDIT] Keys being sent:', Object.keys(updatePayload));
            console.log('[UsersService] Updating profile for', userId, 'with payload:', JSON.stringify(updatePayload));
            try {
                const result = await genDB.use('chat').use('profiles').update(currentProfile.$id, updatePayload);
                console.log('[UsersService] Update result:', result);
                return result;
            } catch (err: any) {
                console.error('[UsersService] Update failed with error:', err);
                if (err?.response) console.error('[UsersService] Error response:', err.response);
                throw err;
            }
        } else {
            // Should not normally happen if they are calling update, but fallback to creating
            // We try to get the full user object to derive a proper username
            const user = await getCurrentUser();
            if (user && user.$id === userId) {
                return await this.ensureProfileForUser(user);
            }
            
            // If we can't get the user, we can't derive a proper username, so we don't create a profile
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
        data: { displayName?: string; bio?: string; avatar?: string; publicKey?: string } = {}
    ) {
        const normalized = normalizeUsername(username);
        if (!normalized) throw new Error('Invalid username');

        const createData: any = {
            userId,
            username: normalized,
            displayName: data.displayName || username,
            bio: data.bio || '',
            avatar: data.avatar || null,
            publicKey: data.publicKey || null
        };

        delete (createData as any).avatarFileId;
        delete (createData as any).avatarUrl;
        delete (createData as any).createdAt;
        delete (createData as any).updatedAt;

        console.log('[UsersService] [PAYLOAD_AUDIT] Creating with keys:', Object.keys(createData));
        console.log('[UsersService] Creating profile for', userId, 'with data:', JSON.stringify(createData));

        return await tablesDB.createRow(
            DB_ID,
            USERS_TABLE,
            ID.unique(),
            createData
        );
    },

    /**
     * Proactively ensures the user has a profile in the global Chat directory.
     * Triggered on every login/session check.
     */
    async ensureProfileForUser(user: { $id: string; email?: string; name?: string; prefs?: Record<string, any> }) {
        if (!user?.$id) return null;

        const existing = await this.getProfileById(user.$id);
        
        const email = user.email || (user as any).email;
        const name = user.name || (user as any).name;

        // --- IDENTITY DERIVATION ---
        let derivedUsername = '';
        let derivedDisplayName = '';

        if (name) {
            const parts = name.trim().split(/\s+/);
            const first = parts[0] || '';
            const second = parts[1] || '';
            
            // Username logic: max 2 parts, normalized
            let usernameBase = '';
            if (first.length > 10) {
                usernameBase = first;
            } else if (second) {
                usernameBase = first + second;
            } else {
                usernameBase = first;
            }

            // Normalize (lowercase, remove non-alphanumeric)
            const normalized = normalizeUsername(usernameBase);
            // Check against a reasonable limit (e.g., 32 chars for Appwrite string fields)
            if (normalized && normalized.length <= 32) {
                derivedUsername = normalized;
            }

            // Display Name logic: max 2 parts
            if (first && second) {
                derivedDisplayName = `${first} ${second}`;
            } else {
                derivedDisplayName = first;
            }
        }

        // Fallback to Email if Name logic failed or name doesn't exist
        if (!derivedUsername && email) {
            const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
            const normalized = normalizeUsername(emailPrefix);
            if (normalized) {
                derivedUsername = normalized;
                if (!derivedDisplayName) {
                    derivedDisplayName = emailPrefix;
                }
            }
        }

        // Handle collision for new profiles
        if (derivedUsername && !await this.isUsernameAvailable(derivedUsername)) {
            if (existing?.username !== derivedUsername) {
                derivedUsername = normalizeUsername(`${derivedUsername}${user.$id.slice(0, 4)}`) || derivedUsername;
            }
        }

        if (existing) {
            // Healing: If existing profile has a generic/placeholder username but we found a better one, update it
            const isGeneric = existing.username.startsWith('u') && existing.username.length > 5;
            const isPlaceholder = existing.username === 'user';
            
            if ((isGeneric || isPlaceholder) && derivedUsername && derivedUsername !== existing.username) {
                console.log('[UsersService] Healing profile for', user.$id, 'to', derivedUsername);
                return await this.updateProfile(user.$id, { 
                    username: derivedUsername,
                    displayName: derivedDisplayName || existing.displayName
                });
            }
            return existing;
        }

        try {
            const avatarId = user?.prefs?.avatar || user?.prefs?.profilePicId || null;
            if (avatarId) {
                try {
                    await this.setAvatarVisible(user.$id, avatarId, true);
                } catch (avatarErr) {
                    console.warn('[UsersService] Failed to make avatar public during setup:', avatarErr);
                }
            }

            const createData: any = {
                displayName: derivedDisplayName || undefined,
                avatar: avatarId
            };

            // If we have no derived identity, we do not create a profile
            if (!derivedUsername) {
                console.warn('[UsersService] Could not derive identity for', user.$id, 'skipping profile creation');
                return null;
            }

            return await this.createProfile(user.$id, derivedUsername, createData);
        } catch (err: unknown) {
            console.error('[UsersService] ensureProfileForUser failed:', err);
            return await this.getProfileById(user.$id);
        }
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

        return await genDB.use('chat').use('profiles').update(profile.$id, {}, {
            permissions: (p, r) => {
                const perms = [
                    p.read(r.user(userId)),
                    p.update(r.user(userId)),
                    p.delete(r.user(userId))
                ];

                if (isDiscoverable) {
                    perms.push(p.read(r.any()));
                }

                return perms;
            }
        });
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