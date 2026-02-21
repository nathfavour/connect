import { useEffect, useState, useCallback } from 'react';
import { Client, Account } from 'appwrite';
import { UsersService } from '@/lib/services/users';
import { APPWRITE_CONFIG } from './appwrite/config';

// Initialize Appwrite
const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

const account = new Account(client);

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const attemptSilentAuth = useCallback(async () => {
        if (typeof window === 'undefined') return;

        const domain = APPWRITE_CONFIG.AUTH.DOMAIN || 'kylrixnote.space';
        const authSubdomain = APPWRITE_CONFIG.AUTH.SUBDOMAIN || 'accounts';

        return new Promise<void>((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.src = `https://${authSubdomain}.${domain}/silent-check`;
            iframe.style.display = 'none';

            const timeout = setTimeout(() => {
                cleanup();
                resolve();
            }, 5000);

            const handleIframeMessage = (event: MessageEvent) => {
                if (event.origin !== `https://${authSubdomain}.${domain}`) return;

                if (event.data?.type === 'idm:auth-status' && event.data.status === 'authenticated') {
                    console.log('Silent auth discovered session in kylrixconnect');
                    checkSession();
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
    }, []);

    const checkSession = async (retryCount = 0) => {
        try {
            const session = await account.get();
            setUser(session);
            await UsersService.ensureProfileForUser(session as any);
            setLoading(false);
            
            // Clear the auth=success param from URL if it exists
            if (typeof window !== 'undefined' && window.location.search.includes('auth=success')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('auth');
                window.history.replaceState({}, '', url.toString());
            }
        } catch (error: any) {
            // Check for auth=success signal in URL
            const hasAuthSignal = typeof window !== 'undefined' && window.location.search.includes('auth=success');
            
            if (hasAuthSignal && retryCount < 3) {
                console.log(`Auth signal detected but session not found in connect. Retrying... (${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return checkSession(retryCount + 1);
            }

            // Try silent discovery
            await attemptSilentAuth();

            try {
                const retrySession = await account.get();
                setUser(retrySession);
                await UsersService.ensureProfileForUser(retrySession as any);
            } catch {
                const isNetworkError = !error.response && error.message?.includes('Network Error') || error.message?.includes('Failed to fetch');
                if (!isNetworkError) {
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    // Listen for postMessage from IDM window
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const domain = APPWRITE_CONFIG.AUTH.DOMAIN || 'kylrixnote.space';
            const authSubdomain = APPWRITE_CONFIG.AUTH.SUBDOMAIN || 'accounts';
            if (event.origin !== `https://${authSubdomain}.${domain}`) return;

            if (event.data?.type === 'idm:auth-success') {
                console.log('Received auth success via postMessage in kylrixconnect');
                checkSession();
                setIsAuthenticating(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);


    const login = async () => {
        if (typeof window === 'undefined' || isAuthenticating) return;

        setIsAuthenticating(true);

        // First, check if we already have a session locally
        try {
            const session = await account.get();
            if (session) {
                console.log('Active session detected in kylrixconnect, skipping IDM window');
                setUser(session);
                setIsAuthenticating(false);
                return;
            }
        } catch (e) {
            // No session, proceed to silent check
        }

        // Try silent auth before opening popup
        await attemptSilentAuth();
        try {
            const session = await account.get();
            if (session) {
                setUser(session);
                setIsAuthenticating(false);
                return;
            }
        } catch (e) {
            // Still no session
        }

        const domain = APPWRITE_CONFIG.AUTH.DOMAIN || 'kylrixnote.space';
        const authSubdomain = APPWRITE_CONFIG.AUTH.SUBDOMAIN || 'accounts';
        const currentUri = window.location.href;

        const idmsUrl = `https://${authSubdomain}.${domain}/login`;
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
                idmsUrl,
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
            setUser(null);
            setIsAuthenticating(false);
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if session delete fails, clear local state
            setUser(null);
            setIsAuthenticating(false);
        }
    };

    return { user, loading, isAuthenticating, login, logout };
}
