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

  /**
   * Set Masterpass Flag on User Document
   */
  async setMasterpassFlag(userId: string, email: string) {
    try {
      const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
      const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;

      // Check if user doc exists in CHAT database
      const res = await tablesDB.listRows(CHAT_DB, USERS_TABLE, [
        Query.equal('userId', userId),
        Query.limit(1)
      ]);

      if (res.total > 0) {
        await tablesDB.updateRow(CHAT_DB, USERS_TABLE, res.rows[0].$id, {
          hasMasterpass: true
        });
      } else {
        // Create user doc if it doesn't exist
        await tablesDB.createRow(CHAT_DB, USERS_TABLE, ID.unique(), {
          userId,
          email,
          hasMasterpass: true
        });
      }
    } catch (_e: unknown) {
      console.error('[Security] Failed to set masterpass flag:', _e);
    }
  }

  getMasterKey(): CryptoKey | null {
    return this.masterKey;
  }

  async setupPin(pin: string): Promise<boolean> {
    if (!this.masterKey || typeof window === "undefined") return false;

    try {
      // 1. Create PIN Verifier (for future login verification)
      const salt = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.PIN_SALT_SIZE));
      const hash = await this.derivePinHash(pin, salt);

      const verifier = {
        salt: btoa(String.fromCharCode(...salt)),
        hash: btoa(String.fromCharCode(...new Uint8Array(hash)))
      };
      localStorage.setItem("kylrix_pin_verifier", JSON.stringify(verifier));

      // 2. Create Ephemeral Session (wrap MEK with PIN)
      const sessionSalt = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.SESSION_SALT_SIZE));
      const ephemeralKey = await this.deriveEphemeralKey(pin, sessionSalt);

      const rawMek = await crypto.subtle.exportKey("raw", this.masterKey);
      const iv = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.IV_SIZE));
      const wrappedMek = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        ephemeralKey,
        rawMek
      );

      const combined = new Uint8Array(iv.length + wrappedMek.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(wrappedMek), iv.length);

      const ephemeral = {
        sessionSalt: btoa(String.fromCharCode(...sessionSalt)),
        wrappedMek: btoa(String.fromCharCode(...combined))
      };
      sessionStorage.setItem("kylrix_ephemeral_session", JSON.stringify(ephemeral));
      sessionStorage.setItem("kylrix_vault_unlocked", "true");

      return true;
    } catch (_e: unknown) {
      console.error("[Security] PIN setup failed", _e);
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
    } catch (__e) {
      return false;
    }
  }

  wipePin() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("kylrix_pin_verifier");
    sessionStorage.removeItem("kylrix_ephemeral_session");
  }

  async unlock(password: string, keyChainEntry?: any): Promise<boolean> {
    try {
      if (!keyChainEntry) return false;

      const salt = new Uint8Array(atob(keyChainEntry.salt).split("").map(c => c.charCodeAt(0)));
      const authKey = await this.deriveKey(password, salt);
      const wrappedKeyBytes = new Uint8Array(atob(keyChainEntry.wrappedKey).split("").map(c => c.charCodeAt(0)));

      const iv = wrappedKeyBytes.slice(0, EcosystemSecurity.IV_SIZE);
      const ciphertext = wrappedKeyBytes.slice(EcosystemSecurity.IV_SIZE);

      const mekBytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, authKey, ciphertext);

      this.masterKey = await crypto.subtle.importKey(
        "raw",
        mekBytes,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
      );

      this.isUnlocked = true;
      return true;
    } catch (_e: unknown) {
      console.error("[Security] Unlock failed", _e);
      return false;
    }
  }

  /**
   * Generates or retrieves the user's E2E Identity (X25519)
   */
  async ensureE2EIdentity(userId: string) {
    if (!this.masterKey) throw new Error("Unlock required for E2E Identity");

    try {
      const res = await tablesDB.listRows(PW_DB, IDENTITIES_TABLE, [
        Query.equal('userId', userId),
        Query.equal('identityType', 'e2e_connect'),
        Query.limit(1)
      ]);

      if (res.total > 0) {
        const doc = res.rows[0];
        // Unwrap private key
        const encryptedPriv = atob(doc.passkeyBlob);
        const decryptedPriv = await this.decrypt(encryptedPriv);
        const privKeyBytes = new Uint8Array(atob(decryptedPriv).split("").map(c => c.charCodeAt(0)));

        const privKey = await crypto.subtle.importKey("pkcs8", privKeyBytes, { name: "ECDH", namedCurve: "X25519" }, true, ["deriveKey", "deriveBits"]);
        const pubKeyBytes = new Uint8Array(atob(doc.publicKey).split("").map(c => c.charCodeAt(0)));
        const pubKey = await crypto.subtle.importKey("raw", pubKeyBytes, { name: "ECDH", namedCurve: "X25519" }, true, []);

        this.identityKeyPair = { publicKey: pubKey, privateKey: privKey };

        try {
          const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
          const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;
          // Attempt to get user by their document ID instead of userId attribute
          try {
              const uDoc = await tablesDB.getRow(CHAT_DB, USERS_TABLE, userId);
              if (uDoc) {
                  await tablesDB.updateRow(CHAT_DB, USERS_TABLE, uDoc.$id, {
                    publicKey: doc.publicKey
                  });
              }
          } catch (e) {
              // Ignore if document not found
          }
        } catch (e) {
          console.warn("Failed to publish existing public key to chat.users", e);
        }

        return doc.publicKey;
      }

      // Generate new pair
      const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "X25519" }, true, ["deriveKey", "deriveBits"]);
      const privExport = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
      const pubExport = await crypto.subtle.exportKey("raw", pair.publicKey);

      const pubBase64 = btoa(String.fromCharCode(...new Uint8Array(pubExport)));
      const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privExport)));
      const encryptedPriv = await this.encrypt(privBase64);

      await tablesDB.createRow(PW_DB, IDENTITIES_TABLE, ID.unique(), {
        userId,
        identityType: 'e2e_connect',
        label: 'Connect E2E Identity',
        publicKey: pubBase64,
        passkeyBlob: btoa(encryptedPriv),
        createdAt: new Date().toISOString()
      });

      this.identityKeyPair = pair;

      try {
        const CHAT_DB = APPWRITE_CONFIG.DATABASES.CHAT;
        const USERS_TABLE = APPWRITE_CONFIG.TABLES.CHAT.USERS;
        try {
            const uDoc = await tablesDB.getRow(CHAT_DB, USERS_TABLE, userId);
            if (uDoc) {
                await tablesDB.updateRow(CHAT_DB, USERS_TABLE, uDoc.$id, {
                  publicKey: pubBase64
                });
            }
        } catch (e) {
            // Ignore if document not found
        }
      } catch (e) {
        console.warn("Failed to publish public key to chat.users", e);
      }

      return pubBase64;
    } catch (_e: unknown) {
      console.error('[Security] Identity sync failed:', _e);
      return null;
    }
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
    const peerPubKey = await crypto.subtle.importKey("raw", pubKeyBytes, { name: "ECDH", namedCurve: "X25519" }, true, []);

    return await crypto.subtle.deriveKey(
      { name: "ECDH", public: peerPubKey },
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

  isPinSet(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("kylrix_pin_verifier");
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

  getVault() {
    return {
      userEmail: null as string | null,
    };
  }
}

export const ecosystemSecurity = EcosystemSecurity.getInstance();
