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
        } catch (error) {
            console.error('Failed to list keychain entries:', error);
            return [];
        }
    },

    async hasMasterpass(userId: string) {
        const entries = await this.listKeychainEntries(userId);
        return entries.some((e: any) => e.type === 'password');
    }
};
