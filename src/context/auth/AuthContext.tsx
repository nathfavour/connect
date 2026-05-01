'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Models } from 'appwrite';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Image from 'next/image';
import { APP_CONFIG } from '@/lib/constants';
import { account, getCurrentUser } from '@/lib/appwrite/client';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  openLoginPopup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthUrl = () => {
    return `https://accounts.kylrix.space/login`;
};

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
};


// Routes that don't require authentication (public routes)
// These are pages that can be viewed without logging in
const PUBLIC_ROUTES: (string | RegExp)[] = [
  '/',                    // Landing page (redirects to dashboard, but should load first)
  '/events',              // Browse public events - discovery page
  /^\/events\/[^/]+$/,    // /events/[eventId] - individual event pages
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(pattern => {
    if (typeof pattern === 'string') {
      return pathname === pattern;
    }
    return pattern.test(pathname);
  });
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);

  // Check if current route is public
  const isOnPublicRoute = isPublicRoute(pathname);

  const checkSession = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setShowAuthOverlay(!currentUser && !isOnPublicRoute);
    } catch {
      setUser(null);
      setShowAuthOverlay(!isOnPublicRoute);
    } finally {
      setIsLoading(false);
    }
  }, [isOnPublicRoute]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isLoading) {
      setShowAuthOverlay(!user && !isOnPublicRoute);
    }
  }, [user, isLoading, isOnPublicRoute]);

  const openLoginPopup = useCallback(async () => {
    if (typeof window === 'undefined' || isAuthenticating) return;

    setIsAuthenticating(true);

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const sourceUrl = window.location.href;
    const authUrlString = getAuthUrl();
    if (!authUrlString) {
        setIsAuthenticating(false);
        return;
    }
    const targetUrl = new URL(authUrlString);
    targetUrl.searchParams.set('source', sourceUrl);
    const targetUrlString = targetUrl.toString();

    if (isMobile()) {
      window.location.assign(targetUrlString);
      return;
    }

    const win = window.open(
      targetUrlString,
      'KylrixAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (win) {
      win.focus();
    } else {
      // Popup blocked - fallback to redirect
      console.warn('Popup blocked, falling back to redirect in kylrixflow');
      window.location.assign(targetUrlString);
    }
    setIsAuthenticating(false);
  }, [isAuthenticating]);

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      setIsAuthenticating(false);
      setShowAuthOverlay(!isOnPublicRoute);
    } catch (error: unknown) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticating, isAuthenticated: !!user, logout, checkSession, openLoginPopup }}>
      {showAuthOverlay && !isOnPublicRoute ? (
        <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
          {/* Blurred Background Content */}
          <Box sx={{ filter: 'blur(8px)', pointerEvents: 'none', height: '100%' }}>
            {children}
          </Box>

          {/* Auth Overlay */}
          <Backdrop
            open={true}
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 9999,
              color: '#fff',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                mb: 1,
              }}
            >
              <Image
                src={APP_CONFIG.logo.url}
                alt={APP_CONFIG.logo.alt}
                width={80}
                height={80}
                style={{ objectFit: 'cover' }}
                priority
              />
            </Box>
            <Typography variant="h4" fontWeight="bold">
              Welcome to {APP_CONFIG.name}
            </Typography>
            <Typography variant="body1" align="center" sx={{ maxWidth: 400, opacity: 0.9 }}>
              Please sign in with your Kylrix account to access your tasks and workflows.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={openLoginPopup}
              disabled={isAuthenticating}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 2,
                textTransform: 'none',
                minWidth: 150,
              }}
            >
              {isAuthenticating ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Backdrop>
        </Box>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
