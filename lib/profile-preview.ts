import { getProfilePicturePreview } from '@/lib/appwrite/client';

const previewCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();
const PREVIEW_STORE_KEY = 'kylrix_avatar_cache_v2';

function cacheKey(fileId: string, width: number, height: number) {
  return `${fileId}:${width}x${height}`;
}

function hydrateCache() {
  if (typeof window === 'undefined') return;

  try {
    const stored = sessionStorage.getItem(PREVIEW_STORE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored) as Record<string, string | null>;
    Object.entries(parsed).forEach(([key, value]) => {
      previewCache.set(key, value);
    });
  } catch {
    // Best-effort only.
  }
}

function persistCache() {
  if (typeof window === 'undefined') return;

  try {
    const obj = Object.fromEntries(previewCache.entries());
    sessionStorage.setItem(PREVIEW_STORE_KEY, JSON.stringify(obj));
  } catch {
    // Best-effort only.
  }
}

hydrateCache();

export async function fetchProfilePreview(fileId?: string | null, width: number = 64, height: number = 64): Promise<string | null> {
  if (!fileId) return null;

  const key = cacheKey(fileId, width, height);
  if (previewCache.has(key)) return previewCache.get(key) ?? null;

  const active = inFlight.get(key);
  if (active) return active;

  const request = (async () => {
    try {
      const url = await getProfilePicturePreview(fileId, width, height);
      const str = url as unknown as string | null;
      previewCache.set(key, str);
      persistCache();
      return str;
    } catch {
      previewCache.set(key, null);
      persistCache();
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}

export function getCachedProfilePreview(fileId?: string | null, width: number = 64, height: number = 64): string | null | undefined {
  if (!fileId) return null;
  return previewCache.get(cacheKey(fileId, width, height));
}
