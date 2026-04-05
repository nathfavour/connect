'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { UsersService } from '@/lib/services/users';
import { useDataNexus } from '@/context/DataNexusContext';
import { syncCurrentUserVerification } from '@/lib/verification';
import { ecosystemSecurity } from '@/lib/ecosystem/security';

interface ProfileContextType {
    profile: any | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    isLoading: true,
    refreshProfile: async () => {},
});

const PROFILE_SETUP_KEY = 'kylrix_profile_initialized';

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const { fetchOptimized, invalidate } = useDataNexus();
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = useCallback(async () => {
        if (!user?.$id) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        try {
            // Use DataNexus for high-performance retrieval and deduplication
            const data = await fetchOptimized(`profile_${user.$id}`, async () => {
                const fetched = await UsersService.getProfileById(user.$id);
                if (!fetched) {
                    console.log('[ProfileProvider] Profile not found, initiating auto-setup...');
                    return await UsersService.ensureProfileForUser(user);
                }
                return fetched;
            }, 1000 * 60 * 60); // 1 hour TTL for own profile

            if (data) {
                let resolvedProfile = data;
                if (user.$id) {
                    const syncedProfile = await syncCurrentUserVerification(user.$id).catch((error) => {
                        console.warn('[ProfileProvider] Failed to sync verification state:', error);
                        return null;
                    });
                    if (syncedProfile) {
                        resolvedProfile = syncedProfile;
                        invalidate(`profile_${user.$id}`);
                    }
                }
                setProfile(resolvedProfile);
                localStorage.setItem(`${PROFILE_SETUP_KEY}_${user.$id}`, 'true');
            }
        } catch (error) {
            console.error('[ProfileProvider] Failed to load/setup profile:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, fetchOptimized, invalidate]);

    useEffect(() => {
        if (!user?.$id) return;

        const unsubscribe = ecosystemSecurity.onStatusChange((status) => {
            if (!status.isUnlocked) return;

            void ecosystemSecurity.ensureE2EIdentity(user.$id)
                .then(async () => {
                    invalidate(`profile_${user.$id}`);
                    await refreshProfile();
                })
                .catch((error) => {
                    console.error('[ProfileProvider] Failed to audit E2E identity:', error);
                });
        });

        return unsubscribe;
    }, [user?.$id, invalidate, refreshProfile]);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        // Hybrid load strategy: First hit cache, then refresh if needed
        refreshProfile();
    }, [user, refreshProfile]);

    return (
        <ProfileContext.Provider value={{ profile, isLoading, refreshProfile: async () => {
            if (user?.$id) invalidate(`profile_${user.$id}`);
            await refreshProfile();
        } }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => useContext(ProfileContext);
