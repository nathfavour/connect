import { normalizeIdentity, type CachedIdentity } from '@/lib/identity-cache';

export type ProfileViewSnapshot = {
  profile: CachedIdentity & Record<string, any>;
  avatarUrl: string | null;
  preparedAt: number;
};

const profileViewCache = new Map<string, ProfileViewSnapshot>();

function normalizeKey(value?: string | null) {
  if (!value) return null;
  const cleaned = value.toString().trim().replace(/^@+/, '').toLowerCase();
  return cleaned || null;
}

function storeSnapshot(snapshot: ProfileViewSnapshot) {
  profileViewCache.set(`id:${snapshot.profile.userId}`, snapshot);
  if (snapshot.profile.username) {
    profileViewCache.set(`username:${snapshot.profile.username}`, snapshot);
  }
}

export function stageProfileView(profile: any, avatarUrl: string | null = null) {
  const normalized = normalizeIdentity(profile);
  if (!normalized) return null;

  const snapshot: ProfileViewSnapshot = {
    profile: { ...profile, ...normalized },
    avatarUrl,
    preparedAt: Date.now(),
  };

  storeSnapshot(snapshot);
  return snapshot;
}

export function getProfileView(key?: string | null) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;

  return profileViewCache.get(`username:${normalizedKey}`)
    || profileViewCache.get(`id:${normalizedKey}`)
    || null;
}

export function clearProfileView(key?: string | null) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return;

  profileViewCache.delete(`username:${normalizedKey}`);
  profileViewCache.delete(`id:${normalizedKey}`);
}
