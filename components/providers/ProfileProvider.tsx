'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { UsersService } from '@/lib/services/users';

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
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = async () => {
        if (!user?.$id) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        try {
            const data = await UsersService.getProfileById(user.$id);
            if (data) {
                setProfile(data);
                localStorage.setItem(`${PROFILE_SETUP_KEY}_${user.$id}`, 'true');
            } else {
                // Auto-setup if not found
                console.log('[ProfileProvider] Profile not found, initiating auto-setup...');
                const newProfile = await UsersService.ensureProfileForUser(user);
                setProfile(newProfile);
                if (newProfile) {
                    localStorage.setItem(`${PROFILE_SETUP_KEY}_${user.$id}`, 'true');
                }
            }
        } catch (error) {
            console.error('[ProfileProvider] Failed to load/setup profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        const isInitialized = localStorage.getItem(`${PROFILE_SETUP_KEY}_${user.$id}`);
        
        if (isInitialized) {
            // We have a cached initialization signal.
            // Just fetch the profile once to hydrate the context.
            // No need to run the full ensureProfileForUser logic which checks/heals.
            UsersService.getProfileById(user.$id).then(data => {
                if (data) {
                    setProfile(data);
                    setIsLoading(false);
                } else {
                    // If local says initialized but DB is empty (e.g. manually deleted), re-run setup
                    refreshProfile();
                }
            }).catch(() => {
                setIsLoading(false);
            });
        } else {
            // First time this session/device - run the full setup
            refreshProfile();
        }
    }, [user?.$id]); // Removed refreshProfile from dependencies to prevent re-runs

    return (
        <ProfileContext.Provider value={{ profile, isLoading, refreshProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => useContext(ProfileContext);
