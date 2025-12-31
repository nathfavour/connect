import { useEffect, useState, useCallback } from 'react';
import { Client, Account } from 'appwrite';

// Initialize Appwrite
const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('67fe9627001d97e37ef3');

const account = new Account(client);

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const attemptSilentAuth = useCallback(async () => {
        if (typeof window === 'undefined') return;

        const domain = process.env.NEXT_PUBLIC_DOMAIN || 'whisperrnote.space';
        const authSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN || 'accounts';

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
                    console.log('Silent auth discovered session in whisperrconnect');
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

    const checkSession = async () => {
        try {
            const session = await account.get();
            setUser(session);
            setLoading(false);
        } catch (error: any) {
            // Try silent discovery
            await attemptSilentAuth();

            try {
                const retrySession = await account.get();
                setUser(retrySession);
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
            const domain = process.env.NEXT_PUBLIC_DOMAIN || 'whisperrnote.space';
            const authSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN || 'accounts';
            if (event.origin !== `https://${authSubdomain}.${domain}`) return;

            if (event.data?.type === 'idm:auth-success') {
                console.log('Received auth success via postMessage in whisperrconnect');
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
                console.log('Active session detected in whisperrconnect, skipping IDM window');
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

        const domain = process.env.NEXT_PUBLIC_DOMAIN || 'whisperrnote.space';
        const authSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN || 'accounts';
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
                'WhisperrAuth',
                `width=${width},height=${height},top=${top},left=${left}`
            );

            if (!popup) {
                console.warn('Popup blocked, falling back to redirect in whisperrconnect');
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
