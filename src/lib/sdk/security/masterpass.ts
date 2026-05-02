import { KylrixSecurity } from '../security';

export interface MasterpassCredentials {
  wrappedKey: string;
  salt: string;
}

export interface MasterpassStatus {
  isUnlocked: boolean;
  hasKey: boolean;
}

export interface MasterpassStateOptions {
  storageKey?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  initiallyUnlocked?: boolean;
}

type MasterpassListener = (status: MasterpassStatus) => void;

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export async function deriveMasterpassKey(password: string, salt: string | Uint8Array) {
  return KylrixSecurity.deriveKey(password, salt);
}

export async function encryptMasterpassPayload(payload: string, password: string, salt: string | Uint8Array) {
  const key = await deriveMasterpassKey(password, salt);
  return KylrixSecurity.encrypt(payload, key);
}

export async function decryptMasterpassPayload(cipher: string, iv: string, password: string, salt: string | Uint8Array) {
  const key = await deriveMasterpassKey(password, salt);
  return KylrixSecurity.decrypt(cipher, iv, key);
}

export async function wrapMasterKey(masterKey: CryptoKey, password: string, saltBase64: string) {
  const authKey = await deriveMasterpassKey(password, decodeBase64(saltBase64));
  const rawKey = await crypto.subtle.exportKey('raw', masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const encryptedMek = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    authKey,
    rawKey
  );

  const combined = new Uint8Array(iv.length + encryptedMek.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedMek), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function unwrapMasterKey(wrappedKeyBase64: string, password: string, saltBase64: string) {
  if (!wrappedKeyBase64 || !saltBase64) {
    throw new Error('Invalid master password record');
  }

  const salt = decodeBase64(saltBase64);
  const authKey = await deriveMasterpassKey(password, salt);

  const wrappedKeyBytes = decodeBase64(wrappedKeyBase64);
  const iv = wrappedKeyBytes.slice(0, 16);
  const ciphertext = wrappedKeyBytes.slice(16);

  const mekBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    authKey,
    ciphertext
  );

  return await crypto.subtle.importKey(
    'raw',
    mekBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

export class MasterpassState {
  private masterKey: CryptoKey | null = null;
  private unlocked = false;
  private readonly storageKey: string;
  private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  private readonly listeners = new Set<MasterpassListener>();

  constructor(options: MasterpassStateOptions = {}) {
    this.storageKey = options.storageKey ?? 'kylrix_vault_unlocked';
    this.storage = options.storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    this.unlocked = options.initiallyUnlocked ?? false;
  }

  private persistUnlocked() {
    if (!this.storage) return;
    if (this.unlocked) {
      this.storage.setItem(this.storageKey, 'true');
      return;
    }

    this.storage.removeItem(this.storageKey);
  }

  private emitChange() {
    const snapshot = this.status;
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.warn('[MasterpassState] listener failed:', error);
      }
    });
  }

  onStatusChange(listener: MasterpassListener) {
    this.listeners.add(listener);
    listener(this.status);

    return () => {
      this.listeners.delete(listener);
    };
  }

  setMasterKey(masterKey: CryptoKey | null) {
    this.masterKey = masterKey;
    this.unlocked = !!masterKey;
    this.persistUnlocked();
    this.emitChange();
  }

  async importMasterKey(keyBytes: ArrayBuffer) {
    try {
      this.masterKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );
      this.unlocked = true;
      this.persistUnlocked();
      this.emitChange();
      return true;
    } catch (error) {
      console.error('[MasterpassState] Failed to import master key', error);
      return false;
    }
  }

  async unlock(password: string, credentials: MasterpassCredentials) {
    try {
      const masterKey = await unwrapMasterKey(credentials.wrappedKey, password, credentials.salt);
      this.masterKey = masterKey;
      this.unlocked = true;
      this.persistUnlocked();
      this.emitChange();
      return true;
    } catch (error) {
      console.error('[MasterpassState] Unlock failed', error);
      return false;
    }
  }

  lock() {
    this.masterKey = null;
    this.unlocked = false;
    this.persistUnlocked();
    this.emitChange();
  }

  get status(): MasterpassStatus {
    return {
      isUnlocked: this.unlocked,
      hasKey: !!this.masterKey,
    };
  }

  isUnlocked() {
    return this.status.isUnlocked;
  }

  isLocked() {
    return !this.status.isUnlocked;
  }

  wasPersistedUnlocked() {
    return this.storage?.getItem(this.storageKey) === 'true';
  }

  getMasterKey() {
    return this.masterKey;
  }
}

export function createMasterpassState(options?: MasterpassStateOptions) {
  return new MasterpassState(options);
}
