import { Client, Account, Databases, ID, Query, Realtime } from 'appwrite';
import { KylrixSecurity } from './security';
import { getEcosystemUrl, ECOSYSTEM_CONFIG, TABLE_DB } from './ecosystem';
import { KylrixPulse } from './pulse';
import { KYLRIX_THEME } from './theme';
import { KylrixConnect } from './connect';
import { KylrixVault } from './vault';
import { KylrixFlow } from './flow';
import { KylrixNote } from './note';

/**
 * Kylrix SDK Configuration
 */
export interface KylrixConfig {
  endpoint?: string;
  project: string;
}

/**
 * The official Kylrix SDK for interacting with the private ecosystem.
 */
export class Kylrix {
  private client: Client;
  public account: Account;
  private databases: Databases;
  private realtimeInstance: Realtime | null = null;
  private pulseInstance: KylrixPulse | null = null;

  // Domain Modules
  public connect = new KylrixConnect(this);
  public vault = new KylrixVault(this);
  public flow = new KylrixFlow(this);
  public note = new KylrixNote(this);

  // Security layer
  public security = KylrixSecurity;

  // Design System
  public theme = KYLRIX_THEME;

  // Ecosystem configuration
  public config = ECOSYSTEM_CONFIG;
  public resolveUrl = getEcosystemUrl;
  
  /**
   * The TableDB abstraction for "Row-based" operations.
   */
  public get tableDb() {
    return {
      getEventPath: TABLE_DB.getEventPath,
      listRows: this.listRows.bind(this),
      getRow: this.getRow.bind(this),
      createRow: this.createRow.bind(this),
      updateRow: this.updateRow.bind(this),
      deleteRow: this.deleteRow.bind(this),
    };
  }

  constructor(config: KylrixConfig) {
    this.client = new Client()
      .setEndpoint(config.endpoint || ECOSYSTEM_CONFIG.DEFAULT_ENDPOINT)
      .setProject(config.project);
    
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
  }

  /**
   * Initializes and returns the Realtime instance.
   */
  get realtime(): Realtime {
    if (!this.realtimeInstance) {
      this.realtimeInstance = new Realtime(this.client);
    }
    return this.realtimeInstance;
  }

  /**
   * High-level Pulse Orchestrator for ecosystem gossip.
   */
  get pulse(): KylrixPulse {
    if (!this.pulseInstance) {
      this.pulseInstance = new KylrixPulse(this.realtime);
    }
    return this.pulseInstance;
  }


  /**
   * Standardized listRows (formerly listDocuments)
   */
  async listRows<T>(databaseId: string, tableId: string, queries: string[] = []) {
    return await this.databases.listDocuments<any>(databaseId, tableId, queries);
  }

  /**
   * Standardized getRow (formerly getDocument)
   */
  async getRow<T>(databaseId: string, tableId: string, rowId: string) {
    return await this.databases.getDocument<any>(databaseId, tableId, rowId);
  }

  /**
   * Standardized createRow (formerly createDocument)
   */
  async createRow<T>(databaseId: string, tableId: string, data: T, rowId: string = ID.unique(), permissions?: string[]) {
    return await this.databases.createDocument<any>(databaseId, tableId, rowId, data as any, permissions);
  }

  /**
   * Standardized updateRow (formerly updateDocument)
   */
  async updateRow<T>(databaseId: string, tableId: string, rowId: string, data: Partial<T>, permissions?: string[]) {
    return await this.databases.updateDocument<any>(databaseId, tableId, rowId, data as any, permissions);
  }

  /**
   * Standardized deleteRow (formerly deleteDocument)
   */
  async deleteRow(databaseId: string, tableId: string, rowId: string) {
    return await this.databases.deleteDocument(databaseId, tableId, rowId);
  }
}

export * from './design';
export * from './api/index';
export * from './bottombar/index';
export * from './ecosystem/index';
export * from './orchestration/index';
export * from './notes/index';
export * from './crosslinks/index';
export * from './calls/index';
export * from './identity/index';
export * from './appwrite/index';
export * from './topbar/index';
export * from './fab/index';
export * from './security/index';
export * from './wallet/index';
export * from './social/index';
export * from './messaging/index';
export * from './huddles/index';
export * from './extensions/index';
export * from './forward/index';
export * from './routing/index';
export * from './pulse';
export * from './connect';
export * from './flow';
export * from './vault';
export * from './note';
export * from './theme';

