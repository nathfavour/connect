'use client';

import { useEffect, useState, useCallback } from 'react';
import { Client, Account } from 'appwrite';
import { APPWRITE_CONFIG } from './appwrite/config';
import { getCurrentUser, getCurrentUserSnapshot, invalidateCurrentUserCache } from './appwrite/client';

// Initialize Appwrite
const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

const account = new Account(client);

export function useAuth() {
    const initialUser = getCurrentUserSnapshot();
    const [user, setUser] = useState<any>(initialUser);
    const [loading, setLoading] = useState(!initialUser);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const attemptSilentAuth = useCallback(async (): Promise<void> => {
        if (typeof window === 'undefined') return;

        const authBaseUrl = 'https://accounts.kylrix.space';

        return new Promise<void>((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.src = `${authBaseUrl}/silent-check`;
            iframe.style.display = 'none';

            const timeout = setTimeout(() => {
                cleanup();
                resolve();
            }, 5000);

            const handleIframeMessage = (event: MessageEvent) => {
                if (event.origin !== authBaseUrl) return;

                if (event.data?.type === 'idm:auth-status' && event.data.status === 'authenticated') {
                    console.log('Silent auth discovered session in kylrixconnect');
                    checkSession(true);
                    cleanup();
                    resolve();
                } else if (event.data?.type === 'idm:auth-status') {
                    cleanup();
                    resolve();
                }
            };

            const cleanup = () => {
                clearTimeout(timeout);
                window.removeEventListener('message', handleIframeMessage);
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            };

            window.addEventListener('message', handleIframeMessage);
            document.body.appendChild(iframe);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkSession = useCallback(async (forceRefresh = false, retryCount = 0): Promise<void> => {
        try {
            const session = await getCurrentUser(forceRefresh);
            setUser(session);
            setLoading(false);
            
            // Clear the auth=success param from URL if it exists
            if (typeof window !== 'undefined' && window.location.search.includes('auth=success')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('auth');
                window.history.replaceState({}, '', url.toString());
            }
        } catch (error: unknown) {
            // Check for auth=success signal in URL
            const hasAuthSignal = typeof window !== 'undefined' && window.location.search.includes('auth=success');
            
            if (hasAuthSignal && retryCount < 3) {
                console.log(`Auth signal detected but session not found in connect. Retrying... (${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                invalidateCurrentUserCache(undefined);
                return checkSession(true, retryCount + 1);
            }
            const err = error as any;
            const isNetworkError = !err.response && (err.message?.includes('Network Error') || err.message?.includes('Failed to fetch'));
            if (!isNetworkError) {
                setUser(null);
            }
            setLoading(false);
        }
    }, [attemptSilentAuth]);

    useEffect(() => {
        checkSession(false);
    }, [checkSession]);

    // Listen for postMessage from IDM window
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const authBaseUrl = 'https://accounts.kylrix.space';
            if (event.origin !== authBaseUrl) return;

            if (event.data?.type === 'idm:auth-success') {
                console.log('Received auth success via postMessage in kylrixconnect');
                invalidateCurrentUserCache(undefined);
                checkSession(true);
                setIsAuthenticating(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [checkSession]);


    const login = async () => {
        if (typeof window === 'undefined' || isAuthenticating) return;

        setIsAuthenticating(true);

        // First, check if we already have a session locally
        try {
            const session = await getCurrentUser(true);
            if (session) {
                console.log('Active session detected in kylrixconnect, skipping IDM window');
                setUser(session);
                setIsAuthenticating(false);
                return;
            }
        } catch (_e: unknown) {
            // No session, proceed to silent check
        }

        // Try silent auth before opening popup
        await attemptSilentAuth();
        try {
            const session = await getCurrentUser(true);
            if (session) {
                setUser(session);
                setIsAuthenticating(false);
                return;
            }
        } catch (_e: unknown) {
            // Still no session
        }

        const authBaseUrl = 'https://accounts.kylrix.space';
        const currentUri = window.location.href;

        const idmsUrl = `${authBaseUrl}/login`;
        const redirectUrl = new URL(idmsUrl);
        redirectUrl.searchParams.set('source', currentUri);

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            window.location.href = redirectUrl.toString();
        } else {
            const width = 500;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            const popup = window.open(
                redirectUrl.toString(),
                'KylrixAuth',
                `width=${width},height=${height},top=${top},left=${left}`
            );

            if (!popup) {
                console.warn('Popup blocked, falling back to redirect in kylrixconnect');
                window.location.href = redirectUrl.toString();
                return;
            }

            // The postMessage listener (added below) will handle success
        }
    };


    const logout = async () => {
        try {
            await account.deleteSession('current');
            invalidateCurrentUserCache(null);
            setUser(null);
            setIsAuthenticating(false);
        } catch (error: unknown) {
            console.error('Logout failed:', error);
            // Even if session delete fails, clear local state
            invalidateCurrentUserCache(null);
            setUser(null);
            setIsAuthenticating(false);
        }
    };

    return { user, loading, isAuthenticating, login, logout };
}
