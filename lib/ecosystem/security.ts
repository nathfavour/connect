/**
 * Whisperr Ecosystem Security Protocol (WESP)
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
  private isUnlocked = false;
  private nodeId: string = 'unknown';

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
      if (msg.type === 'COMMAND' && msg.payload.action === 'SYNC_MASTERPASS_KEY') {
        if (msg.sourceNode === 'id' && this.nodeId !== 'id') {
          await this.syncKeyFromMaster(msg.payload.keyBytes);
        }
      }

      if (msg.type === 'COMMAND' && msg.payload.action === 'LOCK_SYSTEM') {
        this.lock();
      }
    });

    if (this.nodeId !== 'id' && !this.isUnlocked) {
        MeshProtocol.broadcast({
            type: 'RPC_REQUEST',
            targetNode: 'id',
            payload: { method: 'REQUEST_KEY_SYNC' }
        }, this.nodeId);
    }
  }

  private async syncKeyFromMaster(keyBytes: ArrayBuffer) {
    try {
      this.masterKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
      );
      this.isUnlocked = true;
      if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("whisperr_vault_unlocked", "true");
      }
      console.log(`[Security] Node ${this.nodeId} successfully synced MasterPass from ID`);
    } catch (e) {
      console.error("[Security] Key sync failed", e);
    }
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
    } catch (e) {
      console.error('[Security] Failed to fetch keychain:', e);
      return null;
    }
  }

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
    } catch (e) {
      console.error("[Security] Unlock failed", e);
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
      return pubBase64;
    } catch (e) {
      console.error('[Security] Identity sync failed:', e);
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

  async encrypt(data: string): Promise<string> {
    if (!this.masterKey) throw new Error("Security vault locked");
    return this.encryptWithKey(data, this.masterKey);
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.masterKey) throw new Error("Security vault locked");
    return this.decryptWithKey(encryptedData, this.masterKey);
  }

  lock() {
    this.masterKey = null;
    this.identityKeyPair = null;
    this.conversationKeys.clear();
    this.isUnlocked = false;
    if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("whisperr_vault_unlocked");
    }
  }

  get status() {
    return {
      isUnlocked: this.isUnlocked,
      hasKey: !!this.masterKey,
      hasIdentity: !!this.identityKeyPair
    };
  }
}

export const ecosystemSecurity = EcosystemSecurity.getInstance();
