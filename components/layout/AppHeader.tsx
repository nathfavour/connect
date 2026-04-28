"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Tooltip,
  alpha,
  Button,
} from '@mui/material';
import { Wallet, ChevronDown, X as CloseIcon, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getUserProfilePicId } from '@/lib/user-utils';
import { useCachedProfilePreview } from '@/hooks/useCachedProfilePreview';
import { IdentityAvatar, computeIdentityFlags } from '../common/IdentityBadge';
import Logo, { type KylrixApp as LogoApp } from '../common/Logo';
import { WalletSidebar } from '../overlays/WalletSidebar';
import { getEcosystemUrl } from '@/lib/constants';
import { useAppChrome } from '@/components/providers/AppChromeProvider';
import { useIsland } from '@/components/common/DynamicIslandContext';
import { useProfile } from '@/components/providers/ProfileProvider';
import { getCurrentUser, getCurrentUserSnapshot } from '@/lib/appwrite/client';

export const AppHeader = () => {
  const { user } = useAuth();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [fastUser, setFastUser] = useState<any>(() => getCurrentUserSnapshot());
  const { profile: cachedProfile } = useProfile();

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { mode, label, headerHeight, setChromeState } = useAppChrome();
  const { openPanel, closePanel, panel, isActive: isIslandActive } = useIsland();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const displayUser = fastUser || user;
  const profilePicId = cachedProfile?.avatar || getUserProfilePicId(displayUser);
  const profileUrl = useCachedProfilePreview(profilePicId || null, 64, 64);
  const isExpanded = Boolean(panel);
  const isFloatingSearch = false;

  useEffect(() => {
    if (searchParams.get('openWallet') === 'true') {
      setTimeout(() => setIsWalletOpen(true), 0);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('openWallet');
      const newQuery = params.toString();
      router.replace(pathname + (newQuery ? `?${newQuery}` : ''));
    }
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (user?.$id) {
      setFastUser(user);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const resolveUser = async () => {
      const snapshot = getCurrentUserSnapshot();
      if (snapshot?.$id && mounted) {
        setFastUser(snapshot);
      }

      const current = snapshot?.$id ? snapshot : await getCurrentUser();
      if (!mounted) return;
      if (current?.$id) {
        setFastUser(current);
      }
    };

    void resolveUser();
    return () => {
      mounted = false;
    };
  }, []);

  const identitySignals = computeIdentityFlags({
    createdAt: cachedProfile?.$createdAt || (displayUser as any)?.$createdAt || null,
    lastUsernameEdit: cachedProfile?.preferences?.last_username_edit || displayUser?.prefs?.last_username_edit || null,
    profilePicId: cachedProfile?.avatar || displayUser?.prefs?.profilePicId || null,
    username: cachedProfile?.username || displayUser?.prefs?.username || displayUser?.name || null,
    bio: cachedProfile?.bio || displayUser?.prefs?.bio || null,
    tier: displayUser?.prefs?.tier || null,
    publicKey: cachedProfile?.publicKey || null,
    emailVerified: Boolean((displayUser as any)?.emailVerification),
    preferences: cachedProfile?.preferences || null,
  });

  const headerTitle = label || (pathname === '/' ? 'Feed' : pathname === '/chats' ? 'Chats' : pathname === '/calls' ? 'Calls' : pathname?.startsWith('/post/') ? 'Moment' : 'Connect');
  const baseHeaderHeight = mode === 'compact' ? 72 : mode === 'hidden' ? 0 : 88;

  useEffect(() => {
    setChromeState({ dockHeight: panel ? (panel === 'ecosystem' ? 320 : 260) : 0 });
  }, [panel, setChromeState]);

  useEffect(() => {
    if (!panel) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !headerRef.current || headerRef.current.contains(target)) return;
      closePanel();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [closePanel, panel]);

  const stageMotion = {
    animate: { opacity: isExpanded ? 0 : 1, y: isExpanded ? -6 : 0, scale: isExpanded ? 0.96 : 1 },
    transition: { duration: 0.22 },
    style: { pointerEvents: isIslandActive ? 'none' : 'auto' as const },
  };

  return (
    <AppBar
      ref={headerRef}
      position="fixed"
      elevation={0}
        sx={{
          zIndex: 1201,
          bgcolor: '#161412',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '0 0 28px 28px',
          boxShadow: '0 16px 42px rgba(0,0,0,0.42)',
          backgroundImage: 'none',
          display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        height: `${headerHeight}px`,
        transform: mode === 'hidden' ? 'translateY(-110%)' : 'translateY(0)',
        opacity: mode === 'hidden' ? 0 : 1,
        pointerEvents: mode === 'hidden' ? 'none' : 'auto',
        transition: 'transform 260ms ease, opacity 260ms ease, height 260ms ease',
      }}
    >
      <Toolbar sx={{
        gap: { xs: 2, md: 4 },
        px: { xs: 2, md: 4 },
        minHeight: `${baseHeaderHeight}px`,
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
        justifyContent: 'space-between',
      }}>
        <motion.div {...stageMotion} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, pointerEvents: isIslandActive ? 'none' : 'auto' }}>
          <motion.div style={{ display: 'inline-flex' }}>
            <Box
              component="button"
              onClick={() => openPanel('ecosystem')}
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'transparent',
                border: 'none',
                p: 0,
                cursor: 'pointer',
              }}
            >
              <Logo app="connect" size={32} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  right: -6,
                  bottom: -6,
                  width: 18,
                  height: 18,
                  bgcolor: '#0A0908',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.55)',
                  '&:hover': { bgcolor: '#161412', color: 'white' },
                }}
              >
                <ChevronDown size={11} />
              </IconButton>
            </Box>
          </motion.div>
        </motion.div>

        <motion.div {...stageMotion} style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', pointerEvents: isIslandActive ? 'none' : 'auto' }}>
          <Box
            component="button"
            onClick={() => (panel ? closePanel() : openPanel('ecosystem'))}
            sx={{
              width: '100%',
              maxWidth: isExpanded ? '100%' : { xs: '100%', md: 640 },
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.75,
              py: 1.15,
              border: isFloatingSearch ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
              borderBottomWidth: isExpanded ? 0 : 1,
              bgcolor: isFloatingSearch ? 'transparent' : (isExpanded ? '#050505' : '#000000'),
              color: 'white',
              borderRadius: isExpanded ? '18px 18px 0 0' : '999px',
              boxShadow: isFloatingSearch
                ? 'none'
                : (isExpanded
                  ? 'none'
                  : '0 0 0 1px rgba(255,255,255,0.04), 0 0 0 6px rgba(245, 158, 11, 0.02), 0 0 26px rgba(0, 0, 0, 0.55)'),
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 220ms ease',
              animation: isExpanded || isFloatingSearch ? 'none' : 'connectSearchPulse 3.2s ease-in-out infinite',
              '@keyframes connectSearchPulse': {
                '0%, 100%': {
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 0 0 6px rgba(245, 158, 11, 0.02), 0 0 26px rgba(0, 0, 0, 0.55)',
                },
                '50%': {
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 0 0 8px rgba(245, 158, 11, 0.05), 0 0 34px rgba(0, 0, 0, 0.72)',
                },
              },
              '&:hover': { bgcolor: isFloatingSearch ? 'transparent' : (isExpanded ? '#050505' : '#050505') },
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '999px',
                bgcolor: isFloatingSearch ? 'transparent' : 'rgba(255,255,255,0.06)',
                border: isFloatingSearch ? '1px solid transparent' : '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}
            >
              <Search size={16} strokeWidth={2.25} style={{ flexShrink: 0, opacity: 0.82 }} />
            </Box>
            <Typography
              variant="caption"
              noWrap
              sx={{
                flex: 1,
                color: isFloatingSearch ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.82)',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {isExpanded ? (panel === 'profile' ? (displayUser?.name || displayUser?.email || 'Profile') : 'Ecosystem apps') : 'Search'}
            </Typography>
            <Typography variant="caption" sx={{ color: isFloatingSearch ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.35)', fontWeight: 700 }} noWrap>
              {isExpanded ? 'Close' : headerTitle}
            </Typography>
          </Box>
        </motion.div>

        <motion.div {...stageMotion} style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, pointerEvents: isIslandActive ? 'none' : 'auto' }}>
          <Tooltip title="Wallet">
            <IconButton
              onClick={() => setIsWalletOpen(true)}
              sx={{
                color: isWalletOpen ? '#F59E0B' : 'rgba(255, 255, 255, 0.4)',
                bgcolor: alpha('#F59E0B', 0.03),
                border: '1px solid',
                borderColor: isWalletOpen ? alpha('#F59E0B', 0.3) : alpha('#F59E0B', 0.1),
                borderRadius: '12px',
                width: { xs: 36, sm: 42 },
                height: { xs: 36, sm: 42 },
                '&:hover': { bgcolor: alpha('#F59E0B', 0.08) },
              }}
            >
              <Wallet size={18} strokeWidth={1.5} />
            </IconButton>
          </Tooltip>

          {displayUser ? (
            <motion.div style={{ display: 'inline-flex' }}>
              <Box
                component="button"
                onClick={() => openPanel('profile')}
                sx={{
                  p: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  '&:hover': { transform: 'scale(1.05)' },
                  transition: 'transform 0.2s',
                }}
              >
                <IdentityAvatar
                  src={profileUrl || undefined}
                  alt={displayUser?.name || displayUser?.email || 'profile'}
                  fallback={displayUser?.name ? displayUser.name[0].toUpperCase() : 'U'}
                  verified={identitySignals.verified}
                  verifiedOn={identitySignals.verifiedOn}
                  pro={identitySignals.pro}
                  size={38}
                  borderRadius="12px"
                />
              </Box>
            </motion.div>
          ) : (
            <Button
              href={`${getEcosystemUrl('accounts')}/login?source=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}`}
              variant="contained"
              size="small"
              sx={{
                ml: 1,
                bgcolor: '#6366F1',
                color: '#000',
                fontWeight: 800,
                borderRadius: '10px',
                '&:hover': { bgcolor: alpha('#6366F1', 0.8) },
              }}
            >
              Connect
            </Button>
          )}
        </motion.div>
      </Toolbar>

      {panel && (
        <Box
          sx={{
            width: '100%',
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            bgcolor: '#050505',
            overflow: 'hidden',
          }}
        >
          <motion.div
            key={`dock-${panel}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{ width: '100%', display: 'flex' }}
          >
            <Box sx={{ width: '100%', px: { xs: 2, md: 4 }, py: 1.75, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '14px',
                      display: 'grid',
                      placeItems: 'center',
                      color: panel === 'profile' ? '#6366F1' : '#F59E0B',
                      bgcolor: '#000000',
                      border: '1px solid rgba(255,255,255,0.08)',
                      flexShrink: 0,
                    }}
                  >
                    {panel === 'profile' ? (
                      <IdentityAvatar src={profileUrl || undefined} alt="profile" fallback={displayUser?.name ? displayUser.name[0].toUpperCase() : 'U'} size={38} borderRadius="14px" />
                    ) : (
                      <Logo app="connect" size={18} variant="icon" />
                    )}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '0.9rem', lineHeight: 1.1 }} noWrap>
                      {panel === 'profile' ? (displayUser?.name || displayUser?.email || 'Profile') : 'Ecosystem apps'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.52)', fontWeight: 700 }} noWrap>
                      {panel === 'profile' ? 'Profile commands' : 'Jump between apps'}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={closePanel}
                  aria-label="Close topbar panel"
                  size="small"
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '999px',
                    color: 'rgba(255,255,255,0.92)',
                    bgcolor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  <CloseIcon size={16} />
                </IconButton>
              </Box>

              {panel === 'ecosystem' ? (
                <Box sx={{ display: 'grid', gap: 0.75 }}>
                  {[
                    { app: 'note' as const, label: 'Note', description: 'Secure notes and research.' },
                    { app: 'vault' as const, label: 'Vault', description: 'Passwords, 2FA, and keys.' },
                    { app: 'flow' as const, label: 'Flow', description: 'Tasks and workflows.' },
                    { app: 'connect' as const, label: 'Connect', description: 'Secure messages and sharing.' },
                    { app: 'root' as const, label: 'Accounts', description: 'Your Kylrix account.' },
                  ].map((app) => (
                    <Box
                      key={app.label}
                      component="button"
                      onClick={() => window.location.assign(getEcosystemUrl(app.app === 'root' ? 'accounts' : app.app))}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 1.5,
                        py: 1.1,
                        borderRadius: '18px',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: 'white',
                        textAlign: 'left',
                      }}
                    >
                      <Box sx={{ width: 32, height: 32, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
                        <Logo app={app.app as LogoApp} size={16} variant="icon" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }}>
                          {app.label}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }}>
                          {app.description}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gap: 0.75 }}>
                  <Box
                    component="button"
                    onClick={() => {
                      closePanel();
                      router.push('/settings');
                    }}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      px: 1.5,
                      py: 1.1,
                      borderRadius: '18px',
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: 'white',
                      textAlign: 'left',
                    }}
                  >
                    <Box sx={{ width: 32, height: 32, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', flexShrink: 0 }}>
                      <IdentityAvatar src={profileUrl || undefined} alt="profile" fallback={displayUser?.name ? displayUser.name[0].toUpperCase() : 'U'} size={32} borderRadius="12px" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }}>
                        Profile
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }}>
                        Open your public profile
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </motion.div>
        </Box>
      )}

      <WalletSidebar isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </AppBar>
  );
};
