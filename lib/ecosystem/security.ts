/**
 * Kylrix Ecosystem Security Protocol (WESP)
 * Centralized security and encryption logic for the entire ecosystem.
 * Hosted by the ID node (Identity Management System).
 */

import { MeshProtocol } from './mesh';
import { tablesDB } from '../appwrite/client';
import { databases as genDB } from '../../generated/appwrite';
import { APPWRITE_CONFIG } from '../appwrite/config';
import { Query, ID } from 'appwrite';

const PW_DB = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
const KEYCHAIN_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.KEYCHAIN;
const IDENTITIES_TABLE = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.IDENTITIES;

export class EcosystemSecurity {
  private static instance: EcosystemSecurity;
  private masterKey: CryptoKey | null = null;
  private identityKeyPair: CryptoKeyPair | null = null;
  private conversationKeys: Map<string, CryptoKey> = new Map();
  private decryptionCache: Map<string, string> = new Map();
  private isUnlocked = false;
  private nodeId: string = 'unknown';
  // SECURITY: Tab-specific secret (RAM-only) to protect against XSS
  private tabSessionSecret: Uint8Array | null = null;

  private static readonly PBKDF2_ITERATIONS = 600000;
  private static readonly IV_SIZE = 16;
  private static readonly KEY_SIZE = 256;

  // PIN specific constants
  private static readonly PIN_ITERATIONS = 100000;
  private static readonly PIN_SALT_SIZE = 16;
  private static readonly SESSION_SALT_SIZE = 16;

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

  private async deriveKey_old(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      await UsersService.getProfileById(userId);
    } catch (e: any) {
      console.error('[Security] setMasterpassFlag failed:', e);
    }
  }

  async updateWrappedKey(userId: string, wrappedKey: string) {
    // wrappedKey is not in chat.users schema
    console.log('[Security] updateWrappedKey called but not supported in chat.users schema');
  }

  async syncIdentity(userId: string) {
    try {
      const PW_DB_ID = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
      const IDENTITIES_TABLE_ID = APPWRITE_CONFIG.TABLES.PASSWORD_MANAGER.IDENTITIES;

      const res = await tablesDB.listRows(PW_DB_ID, IDENTITIES_TABLE_ID, [
        Query.equal('userId', userId),
        Query.equal('identityType', 'e2e_connect'),
        Query.limit(1)
      ]);

      if (res.total > 0) {
        const doc = res.rows[0];
        // Unwrap private key
        const decryptedPriv = await this.decrypt(doc.passkeyBlob);
        const privKeyBytes = new Uint8Array(atob(decryptedPriv).split("").map(c => c.charCodeAt(0)));

        const privKey = await crypto.subtle.importKey("pkcs8", privKeyBytes, { name: "X25519" }, true, ["deriveKey", "deriveBits"]);
        const pubKeyBytes = new Uint8Array(atob(doc.publicKey).split("").map(c => c.charCodeAt(0)));
        const pubKey = await crypto.subtle.importKey("raw", pubKeyBytes, { name: "X25519" }, true, []);

        this.identityKeyPair = { publicKey: pubKey, privateKey: privKey };

        // Publish publicKey to chat.users
        const { UsersService } = await import('../services/users');
        await UsersService.updateProfile(userId, { publicKey: doc.publicKey });

        return doc.publicKey;
      }

      // Generate new pair
      const pair = (await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveKey", "deriveBits"])) as CryptoKeyPair;
      const privExport = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
      const pubExport = await crypto.subtle.exportKey("raw", pair.publicKey);

      const pubBase64 = btoa(String.fromCharCode(...new Uint8Array(pubExport)));
      const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privExport)));
      const encryptedPriv = await this.encrypt(privBase64);

      await tablesDB.createRow(PW_DB_ID, IDENTITIES_TABLE_ID, ID.unique(), {
        userId,
        identityType: 'e2e_connect',
        label: 'Connect E2E Identity',
        publicKey: pubBase64,
        passkeyBlob: encryptedPriv,
        createdAt: new Date().toISOString()
      });

      this.identityKeyPair = pair;

      // Publish publicKey to chat.users
      const { UsersService } = await import('../services/users');
      await UsersService.updateProfile(userId, { publicKey: pubBase64 });

      return pubBase64;
    } catch (_e: unknown) {
      console.error('[Security] Identity sync failed:', _e);
      return null;
    }
  }

  async ensureE2EIdentity(userId: string) {
    if (this.identityKeyPair) return;
    return await this.syncIdentity(userId);
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

  /**
   * Phase 3: Unlock Session with PIN
   * Reconstructs the MEK from ephemeral RAM using the PIN.
   */
  async unlockWithPin(pin: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const verifierStr = localStorage.getItem("kylrix_pin_verifier");
    const ephemeralStr = sessionStorage.getItem("kylrix_ephemeral_session");

    if (!verifierStr || !ephemeralStr) return false;

    try {
      // 1. Verify PIN against disk verifier
      const verifier = JSON.parse(verifierStr);
      const salt = new Uint8Array(atob(verifier.salt).split("").map(c => c.charCodeAt(0)));
      const expectedHash = verifier.hash;
      const actualHash = btoa(String.fromCharCode(...new Uint8Array(await this.derivePinHash(pin, salt))));

      if (actualHash !== expectedHash) {
        return false;
      }

      // 2. Unwrap MEK from ephemeral storage
      const ephemeral = JSON.parse(ephemeralStr);
      const sessionSalt = new Uint8Array(atob(ephemeral.sessionSalt).split("").map(c => c.charCodeAt(0)));
      const ephemeralKey = await this.deriveEphemeralKey(pin, sessionSalt);

      const wrappedMekBytes = new Uint8Array(atob(ephemeral.wrappedMek).split("").map(c => c.charCodeAt(0)));
      const iv = wrappedMekBytes.slice(0, EcosystemSecurity.IV_SIZE);
      const ciphertext = wrappedMekBytes.slice(EcosystemSecurity.IV_SIZE);

      const rawMek = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        ephemeralKey,
        ciphertext
      );

      this.masterKey = await crypto.subtle.importKey(
        "raw",
        rawMek,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
      );

      this.isUnlocked = true;
      return true;
    } catch (_e: unknown) {
      console.error("[Security] PIN unlock failed", _e);
      return false;
    }
  }

  async verifyPin(pin: string): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const verifierStr = localStorage.getItem("kylrix_pin_verifier");
    if (!verifierStr) return false;

    try {
      const verifier = JSON.parse(verifierStr);
      const salt = new Uint8Array(atob(verifier.salt).split("").map(c => c.charCodeAt(0)));
      const expectedHash = verifier.hash;
      const actualHash = btoa(String.fromCharCode(...new Uint8Array(await this.derivePinHash(pin, salt))));
      return actualHash === expectedHash;
    } catch (_e: unknown) {
      return false;
    }
  }

  isPinSet(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("kylrix_pin_verifier");
  }

  wipePin() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("kylrix_pin_verifier");
    sessionStorage.removeItem("kylrix_ephemeral_session");
  }

  async setupPin(pin: string): Promise<boolean> {
    if (typeof window === "undefined" || !this.masterKey) return false;

    try {
      // 1. Create a persistent verifier (hash of PIN)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await this.derivePinHash(pin, salt);

      const verifier = {
        salt: btoa(String.fromCharCode(...salt)),
        hash: btoa(String.fromCharCode(...new Uint8Array(hash)))
      };
      localStorage.setItem("kylrix_pin_verifier", JSON.stringify(verifier));

      // 2. Wrap MEK with an ephemeral key derived from PIN + Session Secret
      const sessionSalt = crypto.getRandomValues(new Uint8Array(16));
      const ephemeralKey = await this.deriveEphemeralKey(pin, sessionSalt);

      const rawMek = await crypto.subtle.exportKey("raw", this.masterKey);
      const iv = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.IV_SIZE));
      const encryptedMek = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        ephemeralKey,
        rawMek
      );

      const combined = new Uint8Array(iv.length + encryptedMek.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedMek), iv.length);

      const ephemeral = {
        sessionSalt: btoa(String.fromCharCode(...sessionSalt)),
        wrappedMek: btoa(String.fromCharCode(...combined))
      };
      sessionStorage.setItem("kylrix_ephemeral_session", JSON.stringify(ephemeral));

      return true;
    } catch (_e: unknown) {
      console.error("[Security] PIN setup failed", _e);
      return false;
    }
  }

  private async derivePinHash(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(pin),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    return crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt as any,
        iterations: EcosystemSecurity.PIN_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
  }

  private async deriveEphemeralKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const sessionSecret = this.getOrCreateSessionSecret();

    // Mix PIN with tab-specific Session Secret for entropy (XSS-safe)
    const pinBytes = encoder.encode(pin);
    const combined = new Uint8Array(pinBytes.length + sessionSecret.length);
    combined.set(pinBytes);
    combined.set(sessionSecret, pinBytes.length);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      combined,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as any,
        iterations: 10000, // Optimized for instant (<20ms) unlock speed
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false, // SECURITY: Non-extractable. Key cannot be exported by XSS.
      ["encrypt", "decrypt"]
    );
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
