import { ID, Query, Permission, Role } from 'appwrite';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';

const DB_ID = APPWRITE_CONFIG.DATABASES.CHAT;
const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;
const WHISPERRNOTE_DB_ID = APPWRITE_CONFIG.DATABASES.WHISPERRNOTE;
const WHISPERRNOTE_USERS_TABLE = APPWRITE_CONFIG.TABLES.WHISPERRNOTE?.USERS;

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
    async getProfile(username: string) {
        const normalized = normalizeUsername(username);
        if (!normalized) return null;
        const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
            Query.equal('username', normalized),
            Query.limit(1)
        ]);
        return result.rows[0] || null;
    },

    async getProfileById(userId: string) {
        try {
            return await tablesDB.getRow(DB_ID, USERS_TABLE, userId);
        } catch (e) {
            return null;
        }
    },

    async isUsernameAvailable(username: string) {
        const normalized = normalizeUsername(username);
        if (!normalized) return false;
        const result = await tablesDB.listRows(DB_ID, USERS_TABLE, [
            Query.equal('username', normalized)
        ]);
        return result.total === 0;
    },

    async updateProfile(userId: string, data: { username?: string; displayName?: string; bio?: string; avatarUrl?: string; appsActive?: string[] }) {
        // If updating username, check for availability first
        if (data.username) {
            const normalized = normalizeUsername(data.username);
            if (!normalized) {
                throw new Error('Invalid username');
            }
            const available = await this.isUsernameAvailable(normalized);
            if (!available) {
                // Check if it's the current user's own username
                const currentProfile = await this.getProfileById(userId);
                if (currentProfile?.username !== normalized) {
                    throw new Error('Username already taken');
                }
            }
            data.username = normalized;
        }
        return await tablesDB.updateRow(DB_ID, USERS_TABLE, userId, data);
    },

    async createProfile(
        userId: string,
        username: string,
        email: string,
        data: { displayName?: string; bio?: string; avatarUrl?: string; appsActive?: string[] } = {}
    ) {
        // Double check availability before creation
        const normalized = normalizeUsername(username);
        if (!normalized) {
            throw new Error('Invalid username');
        }
        const available = await this.isUsernameAvailable(normalized);
        if (!available) {
            throw new Error('Username already taken');
        }

        return await tablesDB.createRow(
            DB_ID, 
            USERS_TABLE, 
            userId, 
            {
                username: normalized,
                displayName: data.displayName,
                bio: data.bio,
                avatarUrl: data.avatarUrl,
                appsActive: data.appsActive,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            [
                Permission.read(Role.any()), // Public by default
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId))
            ]
        );
    },

    async getWhisperrnoteUserById(userId: string) {
        if (!WHISPERRNOTE_USERS_TABLE) return null;
        try {
            return await tablesDB.getRow(WHISPERRNOTE_DB_ID, WHISPERRNOTE_USERS_TABLE, userId);
        } catch (e) {
            return null;
        }
    },

    async getWhisperrnoteUserByUsername(username: string) {
        if (!WHISPERRNOTE_USERS_TABLE) return null;
        const normalized = normalizeUsername(username);
        if (!normalized) return null;
        try {
            const result = await tablesDB.listRows(WHISPERRNOTE_DB_ID, WHISPERRNOTE_USERS_TABLE, [
                Query.equal('username', normalized),
                Query.limit(1)
            ]);
            return result.rows[0] || null;
        } catch (e) {
            return null;
        }
    },

    async ensureProfileForUser(user: { $id: string; email?: string; name?: string; prefs?: Record<string, any> }) {
        if (!user?.$id) return null;
        const existing = await this.getProfileById(user.$id);
        if (existing) return existing;

        let externalUser: any = null;
        try {
            externalUser = await this.getWhisperrnoteUserById(user.$id);
        } catch (e) {
            externalUser = null;
        }

        const base = externalUser?.username || user?.prefs?.username || user?.name || (user?.email ? user.email.split('@')[0] : '');
        let candidate = normalizeUsername(base) || `user${user.$id.slice(0, 6)}`;

        if (!await this.isUsernameAvailable(candidate)) {
            const suffix = user.$id.slice(0, 4);
            const withSuffix = normalizeUsername(`${candidate}-${suffix}`) || `${candidate}${suffix}`;
            candidate = withSuffix;
            if (!await this.isUsernameAvailable(candidate)) {
                const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
                candidate = normalizeUsername(`${candidate}-${randomSuffix}`) || `${candidate}${randomSuffix}`;
            }
        }

        try {
            return await this.createProfile(user.$id, candidate, user?.email || '', {
                displayName: externalUser?.name || user?.name,
                appsActive: ['connect']
            });
        } catch (e) {
            return null;
        }
    },

    async searchUsers(query: string) {
        // Search by username or displayName
        // Note: Appwrite search queries might need specific indexes.
        // Assuming 'username' and 'displayName' are indexed (fulltext or key).
        // For MVP, we'll search username.
        return await tablesDB.listRows(DB_ID, USERS_TABLE, [
            Query.search('username', query),
            Query.limit(10)
        ]);
    },

    async updatePresence(userId: string, status: 'online' | 'away' | 'busy' | 'offline', customStatus?: string) {
        return await tablesDB.updateRow(DB_ID, USERS_TABLE, userId, {
            presence: status,
            statusMessage: customStatus,
            lastSeen: new Date().toISOString()
        });
    }
};
