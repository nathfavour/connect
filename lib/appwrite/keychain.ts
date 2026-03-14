import { ID, Query } from 'appwrite';
import { tablesDB } from './client';
import { APPWRITE_CONFIG } from './config';

const DB_ID = APPWRITE_CONFIG.DATABASES.PASSWORD_MANAGER;
const KEYCHAIN_TABLE = 'keychain';

export const KeychainService = {
    async listKeychainEntries(userId: string) {
        try {
            const response = await tablesDB.listRows(
                DB_ID,
                KEYCHAIN_TABLE,
                [Query.equal('userId', userId)]
            );
            return response.rows;
        } catch (error: unknown) {
            console.error('Failed to list keychain entries:', error);
            return [];
        }
    },

    async hasMasterpass(userId: string) {
        const entries = await this.listKeychainEntries(userId);
        return entries.some((e: any) => e.type === 'password');
    },

    async createKeychainEntry(data: any) {
        // SAFETY: Existence Guard for Master Passwords
        // Mathematically, a user should only ever have ONE 'password' type entry.
        // We check for existence before creation to prevent the "Mathematical Paradox"
        // of fragmented identities across the ecosystem.
        if (data.type === 'password' && data.userId) {
            const existing = await this.listKeychainEntries(data.userId);
            const hasPassword = existing.some((e: any) => e.type === 'password');
            
            if (hasPassword) {
                console.warn('[KeychainService] Blocked attempt to create duplicate master password.');
                throw new Error('KEYCHAIN_ALREADY_EXISTS');
            }
        }

        return await tablesDB.createRow(
            DB_ID,
            KEYCHAIN_TABLE,
            ID.unique(),
            data
        );
    },

    async deleteKeychainEntry(id: string) {
        return await tablesDB.deleteRow(
            DB_ID,
            KEYCHAIN_TABLE,
            id
        );
    },

    async syncPasskeyStatus(_userId: string) {
        // Implementation for syncing user document isPasskey flag if needed
        // For now, listing entries is sufficient for the UI.
    }
};
