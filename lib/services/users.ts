import { ID, Query, Permission, Role } from 'appwrite';
import { tablesDB, account } from '../appwrite/client';
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

const SYNC_CACHE_KEY = 'whisperr_identity_synced_v2';
const SESSION_SYNC_KEY = 'whisperr_session_identity_ok';

export const UsersService = {
    /**
     * Universal Identity Hook: Efficiently ensures user has a discoverable record in chat.users.
     */
    async ensureGlobalProfile(user: any, force = false) {
        if (!user?.$id || typeof window === 'undefined') return null;

        // Caching Layers: Skip if recently synced in this session or within 24h
        if (!force && sessionStorage.getItem(SESSION_SYNC_KEY)) return null;
        const lastSync = localStorage.getItem(SYNC_CACHE_KEY);
        if (!force && lastSync && (Date.now() - parseInt(lastSync)) < 24 * 60 * 60 * 1000) {
            sessionStorage.setItem(SESSION_SYNC_KEY, '1');
            return null;
        }

        try {
            const [prefs, profile] = await Promise.all([
                account.getPrefs(),
                tablesDB.getRow(DB_ID, USERS_TABLE, user.$id).catch(() => null)
            ]);

            // Identity Construction: Favor prefs, then name, then email prefix
            let username = prefs?.username || user.name || user.email.split('@')[0];
            username = String(username).toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 50);
            if (!username) username = `user_${user.$id.slice(0, 8)}`;

            const profileData = {
                username,
                displayName: user.name || username,
                updatedAt: new Date().toISOString(),
                profilePicId: prefs?.profilePicId || user.profilePicId || null,
                walletAddress: prefs?.walletEth || prefs?.walletAddress || null,
                bio: prefs?.bio || profile?.bio || "",
                privacySettings: JSON.stringify({ public: true, searchable: true })
            };

            const permissions = [
                Permission.read(Role.any()),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id))
            ];

            if (!profile) {
                console.log('[Identity] Initializing global record for:', user.$id);
                await tablesDB.createRow(DB_ID, USERS_TABLE, user.$id, {
                    ...profileData,
                    createdAt: new Date().toISOString()
                }, permissions);
            } else {
                // Self-Healing: Fix malformed records or out-of-sync usernames
                const needsHealing = profile.username !== username || 
                                   !profile.profilePicId && profileData.profilePicId ||
                                   !profile.privacySettings;
                
                if (needsHealing) {
                    console.log('[Identity] Healing global record for:', user.$id);
                    await tablesDB.updateRow(DB_ID, USERS_TABLE, user.$id, profileData);
                }
            }

            // Sync back to Auth Prefs if ecosystem username is missing
            if (prefs.username !== username) {
                await account.updatePrefs({ ...prefs, username });
            }

            localStorage.setItem(SYNC_CACHE_KEY, Date.now().toString());
            sessionStorage.setItem(SESSION_SYNC_KEY, '1');
            return username;
        } catch (e) {
            console.warn('[UsersService] ensureGlobalProfile deferred:', e);
            return null;
        }
    },

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

    async updateProfile(userId: string, data: any) {
        if (data.username) {
            data.username = normalizeUsername(data.username);
            const available = await this.isUsernameAvailable(data.username);
            if (!available) {
                const currentProfile = await this.getProfileById(userId);
                if (currentProfile?.username !== data.username) {
                    throw new Error('Username already taken');
                }
            }
        }
        // Ensure we don't send unknown attributes like avatarUrl if we use profilePicId
        if (data.avatarUrl) {
            data.profilePicId = data.profilePicId || data.avatarUrl;
            delete data.avatarUrl;
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
        const cleaned = query.trim().replace(/^@/, '');
        if (!cleaned) return { rows: [], total: 0 };

        // 1. Primary Search: Global Directory (Connect)
        // Broaden search to include displayName and potentially email prefix
        let res: any = { rows: [], total: 0 };
        try {
            res = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                Query.or([
                    Query.startsWith('username', cleaned.toLowerCase()),
                    Query.startsWith('displayName', cleaned)
                ]),
                Query.limit(15)
            ]);
        } catch (e) {
            console.warn('[UsersService] Global search failed, falling back to username only:', e);
            try {
                res = await tablesDB.listRows(DB_ID, USERS_TABLE, [
                    Query.startsWith('username', cleaned.toLowerCase()),
                    Query.limit(10)
                ]);
            } catch (inner) {
                return { rows: [], total: 0 };
            }
        }

        // 2. Fallback to Note Users: Search by 'name' or 'email'
        if (res.total < 5 && WHISPERRNOTE_USERS_TABLE) {
            try {
                const noteRes = await tablesDB.listRows(WHISPERRNOTE_DB_ID, WHISPERRNOTE_USERS_TABLE, [
                    Query.or([
                        Query.search('name', cleaned),
                        Query.startsWith('email', cleaned.toLowerCase())
                    ]),
                    Query.limit(5)
                ]);

                for (const noteUser of noteRes.rows) {
                    if (!res.rows.find((r: any) => r.$id === noteUser.$id)) {
                        res.rows.push({
                            $id: noteUser.$id,
                            username: noteUser.username || noteUser.email?.split('@')[0] || noteUser.$id.slice(0, 8),
                            displayName: noteUser.name,
                            profilePicId: noteUser.profilePicId || noteUser.avatar || null,
                            privacySettings: JSON.stringify({ public: true, searchable: true })
                        } as any);
                        res.total++;
                    }
                }
            } catch (e) {
                console.warn('[UsersService] Note fallback search failed:', e);
            }
        }

        return res;
    },

    async updatePresence(userId: string, status: 'online' | 'away' | 'busy' | 'offline', customStatus?: string) {
        return await tablesDB.updateRow(DB_ID, USERS_TABLE, userId, {
            presence: status,
            statusMessage: customStatus,
            lastSeen: new Date().toISOString()
        });
    }
};
