import { Client, Account, TablesDB, Storage, Realtime, Databases } from 'appwrite';
import { APPWRITE_CONFIG } from './config';

const client = new Client()
    .setEndpoint('https://api.kylrix.space/v1')
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
export const realtime = new Realtime(client);

export { client };

const CURRENT_USER_CACHE_KEY = 'kylrix_connect_current_user_v2';
const CURRENT_USER_CACHE_TTL = 5 * 60 * 1000;
const CURRENT_USER_REQUEST_TIMEOUT = 8000;

type CachedCurrentUser = {
    user: any | null;
    expiresAt: number;
};

let currentUserCache: CachedCurrentUser | null = null;
let currentUserRequest: Promise<any | null> | null = null;
const originalAccountGet = account.get.bind(account);

const readPersistentCurrentUserCache = (): CachedCurrentUser | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(CURRENT_USER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedCurrentUser;
        if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
            window.localStorage.removeItem(CURRENT_USER_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const writePersistentCurrentUserCache = (cache: CachedCurrentUser | null) => {
    if (typeof window === 'undefined') return;
    try {
        if (!cache) {
            window.localStorage.removeItem(CURRENT_USER_CACHE_KEY);
            return;
        }
        window.localStorage.setItem(CURRENT_USER_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore cache persistence failures.
    }
};

const clearCurrentUserCache = () => {
    currentUserCache = null;
    writePersistentCurrentUserCache(null);
};

const getCachedCurrentUser = () => {
    if (currentUserCache && currentUserCache.expiresAt > Date.now()) return currentUserCache.user;
    const persistent = readPersistentCurrentUserCache();
    if (!persistent) return null;
    currentUserCache = persistent;
    return persistent.user;
};

const setCachedCurrentUser = (user: any | null) => {
    const cache: CachedCurrentUser = { user, expiresAt: Date.now() + CURRENT_USER_CACHE_TTL };
    currentUserCache = cache;
    writePersistentCurrentUserCache(cache);
    return user;
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error('Current user request timed out')), timeoutMs);
        }),
    ]);
};

const patchAccountMethod = (methodName: string) => {
    const original = (account as any)[methodName];
    if (typeof original !== 'function') return;
    (account as any)[methodName] = async (...args: any[]) => {
        const result = await original.apply(account, args);
        clearCurrentUserCache();
        return result;
    };
};

patchAccountMethod('deleteSession');
patchAccountMethod('deleteSessions');
patchAccountMethod('updatePrefs');
patchAccountMethod('updateName');
patchAccountMethod('updateEmail');
patchAccountMethod('updatePhone');
patchAccountMethod('updatePassword');

export function getFilePreview(bucketId: string, fileId: string, width: number = 64, height: number = 64) {
    return storage.getFilePreview(bucketId, fileId, width, height);
}

export function getProfilePicturePreview(fileId: string, width: number = 64, height: number = 64) {
    return getFilePreview("profile_pictures", fileId, width, height);
}

// --- USER SESSION ---

export function invalidateCurrentUserCache(nextValue?: any | null) {
    if (nextValue === undefined || nextValue === null) {
        clearCurrentUserCache();
        return;
    }
    setCachedCurrentUser(nextValue);
}

export async function getCurrentUser(forceRefresh = false): Promise<any | null> {
    if (!forceRefresh) {
        const cached = getCachedCurrentUser();
        if (cached) return cached;
        if (currentUserRequest) return currentUserRequest;
    }

    currentUserRequest = withTimeout(originalAccountGet(), CURRENT_USER_REQUEST_TIMEOUT)
        .then((user) => setCachedCurrentUser(user))
        .catch(() => {
            clearCurrentUserCache();
            return null;
        })
        .finally(() => {
            currentUserRequest = null;
        });

    return currentUserRequest;
}

// Unified resolver: attempts global session then cookie-based fallback
export async function resolveCurrentUser(req?: { headers: { get(k: string): string | null } } | null): Promise<any | null> {
    const direct = await getCurrentUser();
    if (direct && direct.$id) return direct;
    if (req) {
        const fallback = await getCurrentUserFromRequest(req as any);
        if (fallback && (fallback as any).$id) return fallback;
    }
    return null;
}

// Per-request user fetch using incoming Cookie header
export async function getCurrentUserFromRequest(req: { headers: { get(k: string): string | null } } | null | undefined): Promise<any | null> {
    try {
        if (!req) return null;
        const cookieHeader = req.headers.get('cookie') || req.headers.get('Cookie');
        if (!cookieHeader) return null;

        const res = await fetch(`${APPWRITE_CONFIG.ENDPOINT}/account`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': APPWRITE_CONFIG.PROJECT_ID,
                'Cookie': cookieHeader,
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || typeof data !== 'object' || !data.$id) return null;
        return data;
    } catch (e: unknown) {
        console.error('getCurrentUserFromRequest error', e);
        return null;
    }
}
