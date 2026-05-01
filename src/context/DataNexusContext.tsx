"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ecosystemSecurity } from '@/lib/ecosystem/security';

/**
 * KYLRIX CONNECT DATA NEXUS
 * A high-performance, local-first caching layer for Communication.
 * Security: Encrypted persistent storage (localStorage) + Volatile decrypted memory.
 * Aggressively minimizes Appwrite database reads for messages, profiles, and sessions.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface DataNexusContextType {
    getCachedData: <T>(key: string, ttl?: number) => Promise<T | null>;
    setCachedData: <T>(key: string, data: T, ttl?: number) => Promise<void>;
    fetchOptimized: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => Promise<T>;
    invalidate: (key: string) => void;
    purge: () => void;
}

const DataNexusContext = createContext<DataNexusContextType | undefined>(undefined);

const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes default TTL
const STALE_TTL = DEFAULT_TTL * 8;

export function DataNexusProvider({ children }: { children: ReactNode }) {
    // In-memory cache for decrypted ultra-fast access (volatile)
    const memoryCache = useRef<Map<string, CacheEntry<any>>>(new Map());
    // Active request tracking for deduplication
    const activeRequests = useRef<Map<string, Promise<any>>>(new Map());

    const purge = useCallback(() => {
        memoryCache.current.clear();
        activeRequests.current.clear();
        console.log('[Nexus-Connect] Volatile memory cache purged.');
    }, []);

    // Wipe memory cache whenever the system is locked
    useEffect(() => {
        const handleLock = () => {
            purge();
        };
        // We listen for the custom event if dispatched, or just poll security status if needed.
        // For now, we'll assume the app components trigger purge or we can use a mesh listener.
        window.addEventListener("vault-locked", handleLock);
        return () => window.removeEventListener("vault-locked", handleLock);
    }, [purge]);

    const getCachedData = useCallback(async function<T>(key: string, ttl: number = DEFAULT_TTL): Promise<T | null> {
        // 1. Check memory cache first (Decrypted, Volatile)
        const memoryEntry = memoryCache.current.get(key);
        const now = Date.now();

        if (memoryEntry && (now - memoryEntry.timestamp < ttl)) {
            return memoryEntry.data;
        }

        // 2. Check localStorage for persistent encrypted cache
        if (typeof window !== 'undefined') {
            try {
                const persisted = localStorage.getItem(`c_nexus_${key}`);
                if (persisted && ecosystemSecurity.status.isUnlocked) {
                    // PERSISTENCE SECURITY: Encrypted at rest
                    const decrypted = await ecosystemSecurity.decrypt(persisted);
                    if (decrypted) {
                        const entry: CacheEntry<T> = JSON.parse(decrypted);
                        if (now - entry.timestamp < ttl) {
                            // Hydrate volatile memory cache
                            memoryCache.current.set(key, entry);
                            return entry.data;
                        }
                    }
                }
            } catch (_e) {
                // Silently handle cases where vault is locked or data is corrupted
                // console.warn(`[Nexus-Connect] Cache retrieval error for ${key}`);
            }
        }

        return null;
    }, []);

    const setCachedData = useCallback(async function<T>(key: string, data: T, _ttl?: number) {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now()
        };

        // Update volatile memory (Decrypted)
        memoryCache.current.set(key, entry);

        // Update persistent store (Encrypted if unlocked)
        if (typeof window !== 'undefined' && ecosystemSecurity.status.isUnlocked) {
            try {
                // PERSISTENCE SECURITY: Encrypt before writing to localStorage
                const encrypted = await ecosystemSecurity.encrypt(JSON.stringify(entry));
                localStorage.setItem(`c_nexus_${key}`, encrypted);
            } catch (e) {
                console.warn(`[Nexus-Connect] Persist error for ${key}`, e);
            }
        }
    }, []);

    const invalidate = useCallback((key: string) => {
        memoryCache.current.delete(key);
        activeRequests.current.delete(key);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`c_nexus_${key}`);
        }
    }, []);

    const fetchOptimized = useCallback(async function<T>(
        key: string, 
        fetcher: () => Promise<T>, 
        ttl: number = DEFAULT_TTL
    ): Promise<T> {
        // 1. Check if we already have valid decrypted data
        const cached = await getCachedData<T>(key, ttl);
        if (cached !== null) return cached;

        const stale = await getCachedData<T>(key, STALE_TTL);
        if (stale) {
            if (!activeRequests.current.has(key)) {
                const request = (async () => {
                    try {
                        const data = await fetcher();
                        await setCachedData(key, data, ttl);
                        return data;
                    } finally {
                        activeRequests.current.delete(key);
                    }
                })();
                activeRequests.current.set(key, request);
            }
            return stale;
        }

        // 2. Deduplication: Check if an identical request is already in flight
        const existingRequest = activeRequests.current.get(key);
        if (existingRequest) return existingRequest;

        // 3. Perform the actual database fetch
        const request = (async () => {
            try {
                const data = await fetcher();
                await setCachedData(key, data, ttl);
                return data;
            } finally {
                // Cleanup active request tracker
                activeRequests.current.delete(key);
            }
        })();

        activeRequests.current.set(key, request);
        return request;
    }, [getCachedData, setCachedData]);

    return (
        <DataNexusContext.Provider value={{ getCachedData, setCachedData, fetchOptimized, invalidate, purge }}>
            {children}
        </DataNexusContext.Provider>
    );
}

export function useDataNexus() {
    const context = useContext(DataNexusContext);
    if (!context) throw new Error('useDataNexus must be used within DataNexusProvider');
    return context;
}
