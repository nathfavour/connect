"use client";

import React, { useEffect, useState } from 'react';
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
import { Wallet, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useProfile } from '@/components/providers/ProfileProvider';
import { getUserProfilePicId } from '@/lib/user-utils';
import { useCachedProfilePreview } from '@/hooks/useCachedProfilePreview';
import { IdentityAvatar, computeIdentityFlags } from '../common/IdentityBadge';
import Logo from '../common/Logo';
import { WalletSidebar } from '../overlays/WalletSidebar';
import { getEcosystemUrl } from '@/lib/constants';
import { useAppChrome } from '@/components/providers/AppChromeProvider';
import { useIsland } from '@/components/common/DynamicIslandContext';
import { DynamicIslandPanelSurface } from '@/components/common/DynamicIsland';

export const AppHeader = () => {
  const { user } = useAuth();
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { mode, label, headerHeight, setChromeState } = useAppChrome();
  const { openPanel, closePanel, panel, isActive: isIslandActive } = useIsland();
  const { profile: myProfile } = useProfile();
  const profilePicId = myProfile?.avatar || getUserProfilePicId(user);
  const profileUrl = useCachedProfilePreview(profilePicId || null, 64, 64);

  useEffect(() => {
    if (searchParams.get('openWallet') === 'true') {
      setTimeout(() => setIsWalletOpen(true), 0);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('openWallet');
      const newQuery = params.toString();
      router.replace(pathname + (newQuery ? `?${newQuery}` : ''));
    }
  }, [searchParams, router, pathname]);

  const identitySignals = computeIdentityFlags({
    createdAt: myProfile?.$createdAt || myProfile?.createdAt || (user as any)?.$createdAt || null,
    lastUsernameEdit: myProfile?.last_username_edit || user?.prefs?.last_username_edit || null,
    profilePicId: myProfile?.avatar || user?.prefs?.profilePicId || null,
    username: myProfile?.username || user?.prefs?.username || user?.name || null,
    bio: myProfile?.bio || user?.prefs?.bio || null,
    tier: myProfile?.tier || user?.prefs?.tier || null,
    publicKey: myProfile?.publicKey || null,
    emailVerified: Boolean((user as any)?.emailVerification),
    preferences: myProfile?.preferences || null,
  });

  const headerTitle = label || (pathname === '/' ? 'Feed' : pathname === '/chats' ? 'Chats' : pathname === '/calls' ? 'Calls' : pathname?.startsWith('/post/') ? 'Moment' : 'Connect');
  const isCompact = mode === 'compact';
  const baseHeaderHeight = mode === 'compact' ? 72 : mode === 'hidden' ? 0 : 88;

  useEffect(() => {
    setChromeState({ dockHeight: panel ? (panel === 'ecosystem' ? 360 : 284) : 0 });
  }, [panel, setChromeState]);

  const stageMotion = {
    animate: { opacity: isIslandActive ? 0 : 1, y: isIslandActive ? -4 : 0, scale: isIslandActive ? 0.96 : 1 },
    transition: { duration: 0.22 },
    style: { pointerEvents: isIslandActive ? 'none' : 'auto' as const },
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: 1201,
        bgcolor: 'rgba(11, 9, 8, 0.95)',
        backdropFilter: 'blur(25px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backgroundImage: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        overflow: 'visible',
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

        {isCompact ? (
          <motion.div {...stageMotion} style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', pointerEvents: isIslandActive ? 'none' : 'auto' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: '999px', bgcolor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'text.primary', fontWeight: 800, letterSpacing: '0.02em', maxWidth: '100%' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }} noWrap>
                {headerTitle}
              </Typography>
            </Box>
          </motion.div>
        ) : (
          <motion.div {...stageMotion} style={{ flexGrow: 1, pointerEvents: isIslandActive ? 'none' : 'auto' }}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, height: 40 }} />
          </motion.div>
        )}

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
                '&:hover': { bgcolor: alpha('#F59E0B', 0.08), boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)' },
              }}
            >
              <Wallet size={18} strokeWidth={1.5} />
            </IconButton>
          </Tooltip>

          {user ? (
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
                  alt={user?.name || user?.email || 'profile'}
                  fallback={user?.name ? user.name[0].toUpperCase() : 'U'}
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
        <Box sx={{ px: { xs: 1.5, md: 2 }, pb: 1.5, width: '100%' }}>
          <DynamicIslandPanelSurface panel={panel} onClosePanel={closePanel} />
        </Box>
      )}

      <WalletSidebar isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </AppBar>
  );
};
