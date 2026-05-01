/**
 * Kylrix Ecosystem Security Protocol (WESP)
 * Centralized security and encryption logic for the entire ecosystem.
 * Hosted by the ID node (Identity Management System).
 */

import { MeshProtocol } from './mesh';
import { tablesDB } from '../appwrite/client';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { Query, ID } from 'appwrite';

const PW_DB = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
const KEYCHAIN_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.KEYCHAIN;

export class EcosystemSecurity {
  private static instance: EcosystemSecurity;
  private masterKey: CryptoKey | null = null;
  private identityKeyPair: CryptoKeyPair | null = null;
  private identitySyncPromise: Promise<string | null> | null = null;
  private conversationKeys: Map<string, CryptoKey> = new Map();
  private decryptionCache: Map<string, string> = new Map();
  private isUnlocked = false;
  private nodeId: string = 'unknown';
  private statusListeners: Set<(status: { isUnlocked: boolean; hasKey: boolean; hasIdentity: boolean }) => void> = new Set();
  // SECURITY: Tab-specific secret (RAM-only) to protect against XSS
  private tabSessionSecret: Uint8Array | null = null;

  private static readonly PBKDF2_ITERATIONS = 600000;
  private static readonly IV_SIZE = 16;
  private static readonly KEY_SIZE = 256;

  static getInstance(): EcosystemSecurity {
    if (!EcosystemSecurity.instance) {
      EcosystemSecurity.instance = new EcosystemSecurity();
    }
    return EcosystemSecurity.instance;
  }

  init(nodeId: string) {
    this.nodeId = nodeId;
    this.listenForMeshDirectives();
  }

  private listenForMeshDirectives() {
    if (typeof window === 'undefined') return;

    MeshProtocol.subscribe(async (msg) => {
      if (msg.type === 'COMMAND' && msg.payload.action === 'LOCK_SYSTEM') {
        this.lock();
      }
    });
  }

  private emitStatusChange() {
    const status = this.status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.warn('[Security] Status listener failed:', error);
      }
    });
  }

  onStatusChange(listener: (status: { isUnlocked: boolean; hasKey: boolean; hasIdentity: boolean }) => void) {
    this.statusListeners.add(listener);
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private getOrCreateSessionSecret(): Uint8Array {
    if (typeof window === 'undefined') return new Uint8Array(32);
    if (!this.tabSessionSecret) {
      this.tabSessionSecret = crypto.getRandomValues(new Uint8Array(32));
    }
    return this.tabSessionSecret;
  }

  /**
   * Fetches the user's keychain directly from the password manager database.
   * This allows the app to be self-sufficient without a hard ID app redirect.
   */
  async fetchKeychain(userId: string) {
    try {
      const res = await tablesDB.listRows(PW_DB, KEYCHAIN_TABLE, [
        Query.equal('userId', userId),
        Query.equal('type', 'password'),
        Query.orderDesc('$createdAt'),
        Query.limit(1)
      ]);
      return res.rows[0] || null;
    } catch (_e: unknown) {
      console.error('[Security] Failed to fetch keychain:', _e);
      return null;
    }
  }

  /**
   * Derive key from password
   */
  public async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as any,
        iterations: EcosystemSecurity.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: EcosystemSecurity.KEY_SIZE },
      true,
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
    );
  }

  /**
   * Generate a random Master Encryption Key (MEK)
   */
  public async generateRandomMEK(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
  }

  /**
   * Wrap MEK with password and salt
   */
  public async wrapMEK(mek: CryptoKey, password: string, salt: Uint8Array): Promise<string> {
    const authKey = await this.deriveKey(password, salt);
    const mekBytes = await crypto.subtle.exportKey("raw", mek);
    const iv = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.IV_SIZE));

    const encryptedMek = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      authKey,
      mekBytes
    );

    const combined = new Uint8Array(iv.length + encryptedMek.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedMek), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Unwrap MEK with password and salt
   */
  public async unwrapMEK(wrappedKeyBase64: string, password: string, saltBase64: string): Promise<CryptoKey> {
    if (!wrappedKeyBase64 || !saltBase64) {
      throw new Error('Invalid master password record');
    }

    const salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)));
    const authKey = await this.deriveKey(password, salt);

    const wrappedKeyBytes = new Uint8Array(atob(wrappedKeyBase64).split("").map(c => c.charCodeAt(0)));
    const iv = wrappedKeyBytes.slice(0, EcosystemSecurity.IV_SIZE);
    const ciphertext = wrappedKeyBytes.slice(EcosystemSecurity.IV_SIZE);

    const mekBytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      authKey,
      ciphertext
    );

    return await crypto.subtle.importKey(
      "raw",
      mekBytes,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
  }

  // Import a raw key and set it as the master key
  async importMasterKey(keyBytes: ArrayBuffer): Promise<boolean> {
    try {
      this.masterKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        true, // Make it extractable
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
      );
      this.isUnlocked = true;
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("kylrix_vault_unlocked", "true");
      }
      this.emitStatusChange();
      return true;
    } catch (__e) {
      console.error("[Security] Failed to import master key", __e);
      return false;
    }
  }

  async unlock(password: string, passwordEntry: any): Promise<boolean> {
    try {
      const mek = await this.unwrapMEK(passwordEntry.wrappedKey, password, passwordEntry.salt);
      this.masterKey = mek;
      this.isUnlocked = true;
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("kylrix_vault_unlocked", "true");
      }
      this.emitStatusChange();
      return true;
    } catch (_e: unknown) {
      console.error("[Security] Unlock failed", _e);
      return false;
    }
  }

  /**
   * Set Masterpass Flag on User Document
   * Note: chat.users has no hasMasterpass column; we just ensure the doc exists and is fresh.
   */
  async setMasterpassFlag(userId: string, _email: string) {
    try {
      // In connect, we don't have masterpass column in chat.users
      // We just ensure the profile is initialized if it's not
      const { UsersService } = await import('../services/users');
      await UsersService.ensureProfileForUser({ $id: userId, email: _email });
    } catch (e: any) {
      console.error('[Security] setMasterpassFlag failed:', e);
    }
  }

  async updateWrappedKey(_userId: string, _wrappedKey: string) {
    // wrappedKey is not in chat.users schema
    console.log('[Security] updateWrappedKey called but not supported in chat.users schema');
  }

  private async publishIdentityKey(userId: string, publicKey: string) {
    const { UsersService } = await import('../services/users');
    const profile = await UsersService.getProfileById(userId);
    if (!profile || profile.publicKey !== publicKey) {
      await UsersService.updateProfile(userId, { publicKey });
    }
  }

  async syncIdentity(userId: string) {
    if (!this.status.isUnlocked) {
      throw new Error('Vault must be unlocked before syncing E2E identity');
    }

    const PW_DB_ID = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
    const IDENTITIES_TABLE_ID = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.IDENTITIES;

    const res = await tablesDB.listRows(PW_DB_ID, IDENTITIES_TABLE_ID, [
      Query.equal('userId', userId),
      Query.equal('identityType', 'e2e_connect'),
      Query.limit(100)
    ]);

    let identityRows = res.rows;
    if (identityRows.length > 1) {
      const { UsersService } = await import('../services/users');
      const profile = await UsersService.getProfileById(userId);
      const preferred = profile?.publicKey
        ? identityRows.find((row) => row.publicKey === profile.publicKey)
        : null;
      const canonical = preferred || identityRows.find((row) => row.publicKey) || identityRows[0];

      for (const row of identityRows) {
        if (row.$id !== canonical.$id) {
          await tablesDB.deleteRow(PW_DB_ID, IDENTITIES_TABLE_ID, row.$id);
        }
      }

      identityRows = [canonical];
    }

    if (identityRows[0]) {
      const doc = identityRows[0];
      const decryptedPriv = await this.decrypt(doc.passkeyBlob);
      const privKeyBytes = new Uint8Array(atob(decryptedPriv).split('').map((c) => c.charCodeAt(0)));
      const pubKeyBytes = new Uint8Array(atob(doc.publicKey).split('').map((c) => c.charCodeAt(0)));

      const privKey = await crypto.subtle.importKey('pkcs8', privKeyBytes, { name: 'X25519' }, true, ['deriveKey', 'deriveBits']);
      const pubKey = await crypto.subtle.importKey('raw', pubKeyBytes, { name: 'X25519' }, true, []);

      this.identityKeyPair = { publicKey: pubKey, privateKey: privKey };
      await this.publishIdentityKey(userId, doc.publicKey);
      this.emitStatusChange();
      return doc.publicKey;
    }

    const pair = (await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveKey', 'deriveBits'])) as CryptoKeyPair;
    const privExport = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
    const pubExport = await crypto.subtle.exportKey('raw', pair.publicKey);

    const pubBase64 = btoa(String.fromCharCode(...new Uint8Array(pubExport)));
    const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privExport)));
    const encryptedPriv = await this.encrypt(privBase64);

    await tablesDB.createRow(PW_DB_ID, IDENTITIES_TABLE_ID, ID.unique(), {
      userId,
      identityType: 'e2e_connect',
      label: 'Connect E2E Identity',
      publicKey: pubBase64,
      passkeyBlob: encryptedPriv
    });

    this.identityKeyPair = pair;
    await this.publishIdentityKey(userId, pubBase64);
    this.emitStatusChange();
    return pubBase64;
  }

  async ensureE2EIdentity(userId: string) {
    if (!userId) throw new Error('Missing user ID for E2E identity sync');

    if (!this.identitySyncPromise) {
      this.identitySyncPromise = this.syncIdentity(userId).finally(() => {
        this.identitySyncPromise = null;
      });
    }

    return await this.identitySyncPromise;
  }

  /**
   * Symmetric AES-GCM encryption for messages/fields.
   */
  async encryptWithKey(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.IV_SIZE));

    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plaintext);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decryptWithKey(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = new Uint8Array(atob(encryptedData).split("").map((char) => char.charCodeAt(0)));
    const iv = combined.slice(0, EcosystemSecurity.IV_SIZE);
    const encrypted = combined.slice(EcosystemSecurity.IV_SIZE);

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  }

  // --- CONVERSATION KEY CACHE --- //
  getConversationKey(conversationId: string): CryptoKey | null {
    return this.conversationKeys.get(conversationId) || null;
  }

  setConversationKey(conversationId: string, key: CryptoKey) {
    this.conversationKeys.set(conversationId, key);
  }

  clearConversationKey(conversationId: string) {
    this.conversationKeys.delete(conversationId);
  }

  // --- ECDH UNIVERSAL HANDSHAKE PROTOCOL --- //

  async generateConversationKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  private async deriveSharedSecret(peerPublicKeyBase64: string): Promise<CryptoKey> {
    if (!this.identityKeyPair) throw new Error("E2E Identity not initialized");

    const pubKeyBytes = new Uint8Array(atob(peerPublicKeyBase64).split("").map(c => c.charCodeAt(0)));
    const peerPubKey = await crypto.subtle.importKey("raw", pubKeyBytes, { name: "X25519" }, true, []);

    return await crypto.subtle.deriveKey(
      { name: "X25519", public: peerPubKey },
      this.identityKeyPair.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async wrapKeyWithECDH(keyToWrap: CryptoKey, peerPublicKeyBase64: string): Promise<string> {
    const sharedSecret = await this.deriveSharedSecret(peerPublicKeyBase64);
    const rawKey = await crypto.subtle.exportKey("raw", keyToWrap);

    const iv = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.IV_SIZE));
    const encryptedKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      sharedSecret,
      rawKey
    );

    const combined = new Uint8Array(iv.length + encryptedKey.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedKey), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async unwrapKeyWithECDH(wrappedKeyBase64: string, peerPublicKeyBase64: string): Promise<CryptoKey> {
    const sharedSecret = await this.deriveSharedSecret(peerPublicKeyBase64);

    const combined = new Uint8Array(atob(wrappedKeyBase64).split("").map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, EcosystemSecurity.IV_SIZE);
    const ciphertext = combined.slice(EcosystemSecurity.IV_SIZE);

    const rawKey = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      sharedSecret,
      ciphertext
    );

    return await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(data: string): Promise<string> {
    if (!this.masterKey) throw new Error("Security vault locked");
    return this.encryptWithKey(data, this.masterKey);
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.masterKey) throw new Error("Security vault locked");

    // Performance: Check cache first
    if (this.decryptionCache.has(encryptedData)) {
      return this.decryptionCache.get(encryptedData)!;
    }

    const plaintext = await this.decryptWithKey(encryptedData, this.masterKey);

    // Memoize
    this.decryptionCache.set(encryptedData, plaintext);
    return plaintext;
  }

  lock() {
    this.masterKey = null;
    this.identityKeyPair = null;
    this.conversationKeys.clear();
    this.decryptionCache.clear();
    this.isUnlocked = false;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("kylrix_vault_unlocked");
    }
    this.emitStatusChange();
  }

  get status() {
    return {
      isUnlocked: this.isUnlocked,
      hasKey: !!this.masterKey,
      hasIdentity: !!this.identityKeyPair
    };
  }

  getMasterKey(): CryptoKey | null {
    return this.masterKey;
  }

  getVault() {
    return {
      userEmail: null as string | null,
    };
  }
}

export const ecosystemSecurity = EcosystemSecurity.getInstance();
