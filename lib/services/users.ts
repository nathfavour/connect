import { Query, Permission, Role } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;

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
        } catch (e) {
            return null;
        }
    },

    /**
     * Get profile from the global Chat directory by User ID.
     * This is the primary lookup for the feed.
     */
    async getProfileById(userId: string) {
        if (!userId) return null;
        try {
            // Document ID ($id) in the users table is mapped to the Appwrite Account ID
            return await tablesDB.getRow(DB_ID, USERS_TABLE, userId);
        } catch (e) {
            // If getRow fails, try a list search as a robust backup
            try {
                const res = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                    Query.equal('$id', userId),
                    Query.limit(1)
                ]);
                return res.rows[0] || null;
            } catch (inner) {
                return null;
            }
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
        } catch (e) {
            return true; // Assume available on error to avoid blocking
        }
    },

    /**
     * Updates the global Chat directory profile.
     */
    async updateProfile(userId: string, data: { username?: string; displayName?: string; bio?: string; avatarUrl?: string; appsActive?: string[] }) {
        if (data.username) {
            const normalized = normalizeUsername(data.username);
            if (!normalized) throw new Error('Invalid username');
            
            const available = await this.isUsernameAvailable(normalized);
            if (!available) {
                const currentProfile = await this.getProfileById(userId);
                if (currentProfile?.username !== normalized) {
                    throw new Error('Username already taken');
                }
            }
            data.username = normalized;
        }
        return await tablesDB.updateRow(DB_ID, USERS_TABLE, userId, data);
    },

    /**
     * Creates a profile in the global Chat directory.
     */
    async createProfile(
        userId: string,
        username: string,
        data: { displayName?: string; bio?: string; avatarUrl?: string; appsActive?: string[] } = {}
    ) {
        const normalized = normalizeUsername(username);
        if (!normalized) throw new Error('Invalid username');

        return await tablesDB.createRow(
            DB_ID, 
            USERS_TABLE, 
            userId, 
            {
                username: normalized,
                displayName: data.displayName || username,
                bio: data.bio || '',
                avatarUrl: data.avatarUrl || null,
                appsActive: data.appsActive || ['connect'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            [
                Permission.read(Role.any()), // Critical: Document must be public
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId))
            ]
        );
    },

    /**
     * Proactively ensures the user has a profile in the global Chat directory.
     * Triggered on every login/session check.
     */
    async ensureProfileForUser(user: { $id: string; email?: string; name?: string; prefs?: Record<string, any> }) {
        if (!user?.$id) return null;
        
        const existing = await this.getProfileById(user.$id);
        if (existing) return existing;

        // Construct a safe username from available identity data
        const base = user?.prefs?.username || user?.name || (user?.email ? user.email.split('@')[0] : '');
        let candidate = normalizeUsername(base) || `user_${user.$id.slice(0, 6)}`;

        // Handle collision
        if (!await this.isUsernameAvailable(candidate)) {
            candidate = normalizeUsername(`${candidate}_${user.$id.slice(0, 4)}`) || candidate;
        }

        try {
            return await this.createProfile(user.$id, candidate, {
                displayName: user?.name || candidate,
                appsActive: ['connect']
            });
        } catch (e) {
            // Handle race condition if profile was created simultaneously
            return await this.getProfileById(user.$id);
        }
    },

    async searchUsers(query: string) {
        const queries = [Query.limit(20)];
        if (query) {
            queries.push(Query.search('username', query));
        } else {
            queries.push(Query.orderDesc('createdAt'));
        }
        return await tablesDB.listRows(DB_ID, USERS_TABLE, queries);
    }
};