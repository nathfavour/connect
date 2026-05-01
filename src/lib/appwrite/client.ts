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

type CurrentUserSnapshot = {
    user: any;
    expiresAt: number;
};

let currentUserCache: CurrentUserSnapshot | null | undefined = undefined;
let currentUserRequest: Promise<any | null> | null = null;
const CURRENT_USER_CACHE_KEY = 'kylrix_connect_current_user_v1';
const CURRENT_USER_CACHE_TTL = 1000 * 60 * 5;

function canUseStorage() {
    return typeof window !== 'undefined';
}

function readCurrentUserSnapshot(): CurrentUserSnapshot | null {
    if (!canUseStorage()) return null;

    try {
        const raw = localStorage.getItem(CURRENT_USER_CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CurrentUserSnapshot;
        if (!parsed?.user || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
            localStorage.removeItem(CURRENT_USER_CACHE_KEY);
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function writeCurrentUserSnapshot(user: any | null) {
    if (!canUseStorage()) return;

    try {
        if (!user) {
            localStorage.removeItem(CURRENT_USER_CACHE_KEY);
            return;
        }

        const snapshot: CurrentUserSnapshot = {
            user,
            expiresAt: Date.now() + CURRENT_USER_CACHE_TTL,
        };
        localStorage.setItem(CURRENT_USER_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
        // Best effort only.
    }
}

function hydrateCurrentUserCache() {
    if (currentUserCache !== undefined) return;
    const snapshot = readCurrentUserSnapshot();
    if (snapshot) {
        currentUserCache = snapshot;
    }
}

export function getCurrentUserSnapshot() {
    hydrateCurrentUserCache();
    return currentUserCache && currentUserCache.expiresAt > Date.now() ? currentUserCache.user : null;
}

export function getFilePreview(bucketId: string, fileId: string, width: number = 64, height: number = 64) {
    return storage.getFilePreview(bucketId, fileId, width, height);
}

export function getProfilePicturePreview(fileId: string, width: number = 64, height: number = 64) {
    return getFilePreview("profile_pictures", fileId, width, height);
}

// --- USER SESSION ---

export function invalidateCurrentUserCache(nextValue?: any | null) {
    currentUserCache = nextValue
        ? { user: nextValue, expiresAt: Date.now() + CURRENT_USER_CACHE_TTL }
        : null;
    writeCurrentUserSnapshot(nextValue ?? null);
}

export async function getCurrentUser(forceRefresh = false): Promise<any | null> {
    try {
        hydrateCurrentUserCache();

        if (!forceRefresh) {
            if (currentUserCache && currentUserCache.expiresAt > Date.now()) return currentUserCache.user;
            if (currentUserRequest) return currentUserRequest;
        }

        currentUserRequest = account.get()
            .then((user) => {
                currentUserCache = { user, expiresAt: Date.now() + CURRENT_USER_CACHE_TTL };
                writeCurrentUserSnapshot(user);
                return user;
            })
            .catch(() => {
                currentUserCache = null;
                writeCurrentUserSnapshot(null);
                return null;
            })
            .finally(() => {
                currentUserRequest = null;
            });

        return await currentUserRequest;
    } catch {
        return null;
    }
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
