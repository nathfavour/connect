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
  TextField,
  InputAdornment,
  Chip,
  Stack,
  alpha,
  Button,
} from '@mui/material';
import { ChevronDown, Search, X as CloseIcon, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getUserProfilePreviewSource } from '@/lib/user-utils';
import { useCachedProfilePreview } from '@/hooks/useCachedProfilePreview';
import { IdentityAvatar, computeIdentityFlags } from '../common/IdentityBadge';
import Logo, { type KylrixApp as LogoApp } from '../common/Logo';
import { WalletSidebar } from '../overlays/WalletSidebar';
import { getEcosystemUrl } from '@/lib/constants';
import { useAppChrome } from '@/components/providers/AppChromeProvider';
import { usePotato } from '@/components/providers/PotatoProvider';
import { useIsland } from '@/components/common/DynamicIslandContext';
import { useProfile } from '@/components/providers/ProfileProvider';
import { getCurrentUser, getCurrentUserSnapshot } from '@/lib/appwrite/client';
import { UsersService } from '@/lib/services/users';
import { getCachedIdentityById, seedIdentityCache, subscribeIdentityCache } from '@/lib/identity-cache';
import { stageProfileView } from '@/lib/profile-handoff';

export const AppHeader = () => {
  const { user } = useAuth();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [fastUser, setFastUser] = useState<any>(() => getCurrentUserSnapshot());
  const [fastProfile, setFastProfile] = useState<any | null>(() => {
    const snapshot = getCurrentUserSnapshot();
    return snapshot?.$id ? getCachedIdentityById(snapshot.$id) : null;
  });
  const { profile: cachedProfile } = useProfile();
  const potato = usePotato();

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { mode, headerHeight, setChromeState } = useAppChrome();
  const { openPanel, closePanel, panel, isActive: isIslandActive } = useIsland();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const dockContentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const displayUser = fastUser || user;
  const displayProfile = cachedProfile || fastProfile;
  const profilePreviewSource = displayProfile?.avatarUrl || displayProfile?.avatarFileId || displayProfile?.avatar || getUserProfilePreviewSource(displayUser);
  const profileUrl = useCachedProfilePreview(profilePreviewSource || null, 64, 64);
  const isExpanded = Boolean(panel);
  const searchSurface = potato.buildSearchSurface(searchQuery);
  const searchDockMaxHeight = '50vh';
  const profileSeed = displayProfile || (displayUser ? { ...displayUser, avatar: displayUser?.prefs?.profilePicId || null } : null);
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
    if (profileSeed?.$id || profileSeed?.userId) {
      stageProfileView(profileSeed, profileUrl || null);
    }
  }, [profileSeed, profileUrl]);

  useEffect(() => {
    const userId = displayUser?.$id;
    if (!userId) {
      setFastProfile(null);
      return;
    }

    setFastProfile(getCachedIdentityById(userId));
    return subscribeIdentityCache((identity) => {
      if (identity.userId === userId) {
        setFastProfile(identity);
      }
    });
  }, [displayUser?.$id]);

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
    createdAt: cachedProfile?.$createdAt || fastProfile?.cachedAt || (displayUser as any)?.$createdAt || null,
    lastUsernameEdit: cachedProfile?.preferences?.last_username_edit || fastProfile?.preferences?.last_username_edit || displayUser?.prefs?.last_username_edit || null,
    profilePicId: displayProfile?.avatar || displayUser?.prefs?.profilePicId || null,
    username: cachedProfile?.username || fastProfile?.username || displayUser?.prefs?.username || displayUser?.name || null,
    bio: cachedProfile?.bio || fastProfile?.bio || displayUser?.prefs?.bio || null,
    tier: displayUser?.prefs?.tier || null,
    publicKey: cachedProfile?.publicKey || fastProfile?.publicKey || null,
    emailVerified: Boolean((displayUser as any)?.emailVerification),
    preferences: cachedProfile?.preferences || fastProfile?.preferences || null,
  });

  const baseHeaderHeight = mode === 'compact' ? 72 : mode === 'hidden' ? 0 : 88;

  useEffect(() => {
    if (!panel) {
      setChromeState({ dockHeight: 0 });
      return;
    }

    const measureDockHeight = () => {
      const height = dockContentRef.current?.getBoundingClientRect().height ?? 0;
      setChromeState({ dockHeight: Math.max(0, Math.ceil(height) - baseHeaderHeight) });
    };

    measureDockHeight();

    if (typeof ResizeObserver === 'undefined' || !dockContentRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => measureDockHeight());
    observer.observe(dockContentRef.current);
    window.addEventListener('resize', measureDockHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureDockHeight);
    };
  }, [panel, setChromeState]);

  useEffect(() => {
    if (panel !== 'search') {
      setSearchQuery('');
      setPeopleResults([]);
      setSearchingPeople(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [panel]);

  useEffect(() => {
    if (panel !== 'search') return;

    const text = searchQuery.trim().toLowerCase();
    if (text.length < 2) {
      setPeopleResults([]);
      setSearchingPeople(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setSearchingPeople(true);
      try {
        const result = await UsersService.searchUsers(text);
        if (!active) return;
        const rows = (result.rows || []).filter((candidate: any) => (candidate.userId || candidate.$id) !== displayUser?.$id);
        rows.forEach((candidate: any) => seedIdentityCache(candidate));
        setPeopleResults(rows.slice(0, 5));
      } catch (error) {
        if (active) {
          console.warn('[AppHeader] People search failed:', error);
          setPeopleResults([]);
        }
      } finally {
        if (active) setSearchingPeople(false);
      }
    }, 260);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [displayUser?.$id, panel, searchQuery]);

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
    animate: { opacity: isExpanded ? 0 : 1, scale: isExpanded ? 0.96 : 1 },
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
          height: panel ? 'auto' : `${headerHeight}px`,
          minHeight: panel ? 0 : `${baseHeaderHeight}px`,
          transform: mode === 'hidden' ? 'translateY(-110%)' : 'translateY(0)',
          opacity: mode === 'hidden' ? 0 : 1,
          pointerEvents: mode === 'hidden' ? 'none' : 'auto',
          transition: 'transform 260ms ease, opacity 260ms ease, height 260ms ease',
        }}
    >
      {!panel && (
        <Toolbar sx={{
          gap: { xs: 2, md: 4 },
          px: { xs: 2, md: 4 },
          minHeight: `${baseHeaderHeight}px`,
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          justifyContent: 'space-between',
          position: 'relative',
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

          <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: isIslandActive ? 'none' : 'auto', zIndex: 2 }}>
            <motion.div {...stageMotion}>
              <Box
                component="button"
                onClick={() => (panel === 'search' ? closePanel() : openPanel('search'))}
                sx={{
                  width: { xs: 44, md: 114 },
                  minWidth: { xs: 44, md: 114 },
                  maxWidth: { xs: 44, md: 114 },
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.25,
                  px: 1,
                  py: 0,
                  minHeight: 44,
                  border: '1px solid rgba(255,255,255,0.08)',
                  bgcolor: '#000000',
                  color: 'white',
                  borderRadius: { xs: '999px', md: '24px' },
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 0 0 6px rgba(245, 158, 11, 0.02), 0 0 26px rgba(0, 0, 0, 0.55)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, border-radius 150ms ease-out, width 150ms ease-out, min-width 150ms ease-out, max-width 150ms ease-out, background-color 150ms ease-out',
                  animation: 'connectSearchPulse 3.2s ease-in-out infinite',
                  '@keyframes connectSearchPulse': {
                    '0%, 100%': {
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 0 0 6px rgba(245, 158, 11, 0.02), 0 0 26px rgba(0, 0, 0, 0.55)',
                    },
                    '50%': {
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 0 0 8px rgba(245, 158, 11, 0.05), 0 0 34px rgba(0, 0, 0, 0.72)',
                    },
                  },
                  '&:hover': { transform: 'translateY(-1px)' },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, width: '100%', height: '100%' }}>
                  <Search size={16} strokeWidth={2.25} style={{ flexShrink: 0, opacity: 0.84 }} />
                </Box>
              </Box>
            </motion.div>
          </Box>

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
                  onMouseEnter={() => {
                    if (profileSeed?.username) {
                      void router.prefetch(`/u/${encodeURIComponent(profileSeed.username)}`);
                    }
                    if (profileSeed) {
                      stageProfileView(profileSeed, profileUrl || null);
                    }
                  }}
                  onClick={async () => {
                    if (profileSeed) {
                      stageProfileView(profileSeed, profileUrl || null);
                      const username = profileSeed.username || profileSeed.displayName?.toString().trim().toLowerCase();
                      if (username) {
                        void router.prefetch(`/u/${encodeURIComponent(username)}`);
                      }
                    }
                    openPanel('profile');
                  }}
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
      )}

        {panel && (
          <Box
            ref={dockContentRef}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'stretch',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              bgcolor: '#161412',
              overflow: 'hidden',
              maxHeight: panel === 'search' ? searchDockMaxHeight : 'none',
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
              <Box sx={{ width: '100%', px: { xs: 2, md: 4 }, py: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'stretch', minHeight: 0 }}>
                {panel === 'search' ? (
                  <Box sx={{ display: 'grid', gap: 1.25, minHeight: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ width: 38, height: 38, borderRadius: '14px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                        <Search size={16} />
                      </Box>
                      <TextField
                        inputRef={searchInputRef}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search notes, goals, moments, calls, people, apps"
                        variant="standard"
                        fullWidth
                        InputProps={{
                          disableUnderline: true,
                          sx: {
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.98rem',
                            '& input::placeholder': { color: 'rgba(255,255,255,0.42)', opacity: 1 },
                          },
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography sx={{ color: 'rgba(255,255,255,0.42)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', mr: 0.5 }}>
                                Search
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ flex: 1, minWidth: { xs: '100%', md: 320 } }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            closePanel();
                          }
                        }}
                      />
                      <Button
                        onClick={closePanel}
                        sx={{
                          minWidth: 0,
                          px: 2,
                          height: 38,
                          borderRadius: '999px',
                          bgcolor: 'rgba(255,255,255,0.06)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                        }}
                      >
                        Close
                      </Button>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 1,
                        minHeight: 0,
                        maxHeight: `calc(${searchDockMaxHeight} - 88px)`,
                        overflowY: 'auto',
                        pr: 0.5,
                        pb: 0.5,
                      }}
                    >
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {searchSurface.snippets.slice(0, 4).map((snippet) => (
                          <Chip
                            key={snippet.id}
                            label={snippet.title}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.04)',
                              color: 'rgba(255,255,255,0.84)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              '& .MuiChip-label': { px: 1.25 },
                            }}
                          />
                        ))}
                      </Stack>

                      <Box sx={{ display: 'grid', gap: 0.75 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Quick actions
                        </Typography>
                        <Box sx={{ display: 'grid', gap: 0.75 }}>
                          {searchSurface.quickActions.slice(0, 3).map((action) => (
                            <Box
                              key={action.id}
                              component="button"
                              onClick={action.onSelect}
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
                                opacity: action.disabled ? 0.5 : 1,
                                pointerEvents: action.disabled ? 'none' : 'auto',
                              }}
                            >
                              <Box sx={{ width: 32, height: 32, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: `${action.accent}1F`, color: action.accent, flexShrink: 0 }}>
                                <Logo app="connect" size={16} variant="icon" />
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }} noWrap>
                                  {action.title}
                                </Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }} noWrap>
                                  {action.description}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'grid', gap: 0.75 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Search across apps
                        </Typography>
                        <Box sx={{ display: 'grid', gap: 0.75 }}>
                          {searchSurface.searchTargets.slice(0, 4).map((action) => (
                            <Box
                              key={action.id}
                              component="button"
                              onClick={action.onSelect}
                              sx={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                                px: 1.5,
                                py: 1.1,
                                borderRadius: '18px',
                                bgcolor: action.kind === potato.currentApp ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${action.kind === potato.currentApp ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.05)'}`,
                                color: 'white',
                                textAlign: 'left',
                              }}
                            >
                              <Box sx={{ width: 32, height: 32, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: `${action.accent}1F`, color: action.accent, flexShrink: 0 }}>
                                <Logo app="connect" size={16} variant="icon" />
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }} noWrap>
                                  {action.title}
                                </Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }} noWrap>
                                  {action.description}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {searchingPeople || peopleResults.length > 0 ? (
                        <Box sx={{ display: 'grid', gap: 0.75 }}>
                          <Typography sx={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            People
                          </Typography>
                          {searchingPeople ? (
                            <Typography sx={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.84rem' }}>
                              Searching people...
                            </Typography>
                          ) : (
                            peopleResults.slice(0, 3).map((person) => (
                              <Box
                                key={person.$id || person.userId}
                                component="button"
                                onClick={() => {
                                  setSearchQuery(person.displayName || person.username || person.name || '');
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
                                <IdentityAvatar
                                  src={person.avatarUrl || person.avatar || undefined}
                                  alt={person.displayName || person.username || person.name || 'person'}
                                  fallback={(person.displayName || person.username || person.name || 'U')[0]?.toUpperCase() || 'U'}
                                  size={32}
                                  borderRadius="12px"
                                />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }} noWrap>
                                    {person.displayName || person.username || person.name || 'Person'}
                                  </Typography>
                                  <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }} noWrap>
                                    {person.username ? `@${String(person.username).replace(/^@/, '')}` : 'Direct chat target'}
                                  </Typography>
                                </Box>
                              </Box>
                            ))
                          )}
                        </Box>
                      ) : null}
                    </Box>
                  </Box>
                ) : panel === 'ecosystem' ? (
                  <Box sx={{ display: 'grid', gap: 0.75 }}>
                    {[
                      { app: 'note' as const, label: 'Note', description: 'Secure notes and research.' },
                      { app: 'vault' as const, label: 'Vault', description: 'Passwords, 2FA, and keys.' },
                      { app: 'flow' as const, label: 'Goals', description: 'Tasks, plans, and follow-through.' },
                      { app: 'connect' as const, label: 'Connect', description: 'Secure messages and sharing.' },
                      { app: 'root' as const, label: 'Accounts', description: 'Your Kylrix account.' },
                    ].map((app) => {
                      const selected = app.app === 'connect';
                      return (
                        <Box
                          key={app.label}
                          component="button"
                          onClick={() => {
                            if (selected) return;
                            window.location.assign(getEcosystemUrl(app.app === 'root' ? 'accounts' : app.app));
                          }}
                          aria-disabled={selected}
                          sx={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            px: 1.5,
                            py: 1.1,
                            borderRadius: '18px',
                            bgcolor: selected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${selected ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.05)'}`,
                            color: 'white',
                            textAlign: 'left',
                            opacity: selected ? 0.6 : 1,
                            pointerEvents: selected ? 'none' : 'auto',
                          }}
                        >
                          <Box sx={{ width: 32, height: 32, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
                            <Logo app={app.app as LogoApp} size={16} variant="icon" />
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }} noWrap>
                              {app.label}
                              {selected ? ' • Current app' : ''}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }} noWrap>
                              {app.description}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
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
