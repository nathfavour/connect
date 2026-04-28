'use client';

import React, { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Button,
  Paper,
  TextField,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Skeleton,
  alpha,
} from '@mui/material';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSudo } from '@/context/SudoContext';
import { useAppChrome } from '@/components/providers/AppChromeProvider';
import { ChatService } from '@/lib/services/chat';
import { UsersService } from '@/lib/services/users';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { ECOSYSTEM_APPS, getEcosystemUrl } from '@/lib/constants';
import { getCachedIdentityById, seedIdentityCache } from '@/lib/identity-cache';
import { stageProfileView } from '@/lib/profile-handoff';
import { useProfile } from '@/components/providers/ProfileProvider';
import { useCachedProfilePreview } from '@/hooks/useCachedProfilePreview';
import toast from 'react-hot-toast';
import { IslandContext, IslandPanel } from './DynamicIslandContext';
import Logo from './Logo';
import { 
  CheckCircle as SuccessIcon, 
  Error as ErrorIcon, 
  Info as InfoIcon, 
  Warning as WarningIcon, 
  Star as ProIcon,
  EmojiObjects as IdeaIcon,
  Message as ConnectIcon,
} from '@mui/icons-material';
import {
  Search as SearchIcon,
  ArrowRight as ArrowRightIcon,
  Copy as CopyIcon,
  X as CloseIcon,
  MessageCircle as MessageCircleIcon,
  Phone as PhoneIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  LogOut as LogOutIcon,
} from 'lucide-react';

export type IslandType = 'success' | 'error' | 'warning' | 'info' | 'pro' | 'system' | 'suggestion' | 'connect';

export type KylrixApp = 'root' | 'vault' | 'flow' | 'note' | 'connect';
export interface IslandNotification {
  id: string;
  type: IslandType;
  title: string;
  message?: string;
  app?: KylrixApp;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  majestic?: boolean;
  shape?: 'island' | 'ball' | 'pill';
  personal?: boolean;
}

export const IslandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<IslandNotification[]>([]);
  const [panel, setPanel] = useState<IslandPanel | null>(null);
  const [lastActivity, setLastActivity] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLastActivity(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  const showIsland = useCallback((notification: Omit<IslandNotification, 'id'>) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const newNotif = { ...notification, id, duration: notification.duration || (notification.majestic ? 10000 : 6000) };
    setNotifications((prev) => [...prev, newNotif]);
  }, []);

  const dismissIsland = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const openPanel = useCallback((nextPanel: IslandPanel) => {
    setPanel((current) => (current === nextPanel ? null : nextPanel));
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
  }, []);

  // Track user activity
  useEffect(() => {
    const activityHandler = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', activityHandler);
    window.addEventListener('keydown', activityHandler);
    window.addEventListener('click', activityHandler);
    
    return () => {
      window.removeEventListener('mousemove', activityHandler);
      window.removeEventListener('keydown', activityHandler);
      window.removeEventListener('click', activityHandler);
    };
  }, []);

  // Proactive suggestions for Connect
  useEffect(() => {
    const idleInterval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivity;

      if (idleTime > 45000 && notifications.length === 0) {
        const userName = user?.name?.split(' ')[0] || '';
        
        const suggestions = [
          {
            type: 'suggestion' as IslandType,
            title: userName || "Quick Sync?",
            message: "You can instantly attach notes from Kylrix Note in any conversation here.",
            action: { label: "Learn How", onClick: () => {} },
            personal: !!userName,
            app: 'note' as KylrixApp,
          },
          {
            type: 'connect' as IslandType,
            title: userName || "Vault Secure",
            message: "Your messages are end-to-end encrypted with your Kylrix Vault master password.",
            action: { label: "Security Status", onClick: () => {} },
            majestic: true,
            personal: !!userName,
            app: 'vault' as KylrixApp,
          },
          {
            type: 'suggestion' as IslandType,
            title: "Thinking space",
            message: "Use your self-chat to store ideas, snippets, and secrets for yourself.",
            action: { label: "Open Vault", onClick: () => {} },
            app: 'connect' as KylrixApp,
          }
        ];
        
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        showIsland(randomSuggestion);
        setLastActivity(Date.now());
      }
    }, 15000);

    return () => clearInterval(idleInterval);
  }, [lastActivity, notifications.length, showIsland, user]);

  return (
    <IslandContext.Provider value={{ openPanel, closePanel, isActive: Boolean(panel), panel }}>
      {children}
    </IslandContext.Provider>
  );
};

const APP_TONES: Record<KylrixApp, { primary: string; secondary: string; label: string }> = {
  root: { primary: '#6366F1', secondary: '#6366F1', label: 'Kylrix' },
  vault: { primary: '#6366F1', secondary: '#10B981', label: 'Vault' },
  flow: { primary: '#6366F1', secondary: '#A855F7', label: 'Flow' },
  note: { primary: '#6366F1', secondary: '#EC4899', label: 'Note' },
  connect: { primary: '#6366F1', secondary: '#F59E0B', label: 'Connect' },
};

const TYPE_TONES: Record<IslandType, { primary: string; secondary: string; label: string }> = {
  success: { primary: '#6366F1', secondary: '#6366F1', label: 'Success' },
  error: { primary: '#FF3B30', secondary: '#FF6B6B', label: 'Error' },
  warning: { primary: '#FF9500', secondary: '#FDBA74', label: 'Warning' },
  info: { primary: '#6366F1', secondary: '#60A5FA', label: 'Info' },
  pro: { primary: '#6366F1', secondary: '#A855F7', label: 'Pro' },
  system: { primary: '#6366F1', secondary: '#94A3B8', label: 'System' },
  suggestion: { primary: '#A855F7', secondary: '#C084FC', label: 'Suggestion' },
  connect: { primary: '#6366F1', secondary: '#F59E0B', label: 'Connect' },
};

type SearchAction =
  | {
      id: string;
      kind: 'route';
      title: string;
      description: string;
      color: string;
      terms: string[];
      onSelect: () => void;
      icon: React.ReactNode;
    }
  | {
      id: string;
      kind: 'person';
      title: string;
      description: string;
      color: string;
      terms: string[];
      onSelect: () => void;
      icon: React.ReactNode;
      avatar?: string | null;
    };

function getTone(notification: IslandNotification) {
  return notification.app ? APP_TONES[notification.app] : TYPE_TONES[notification.type];
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getLogoApp(appId: string): KylrixApp {
  switch (appId) {
    case 'vault':
    case 'flow':
    case 'note':
    case 'connect':
      return appId;
    case 'accounts':
      return 'root';
    default:
      return 'root';
  }
}

type IslandGlyphMode = 'idle' | 'typing' | 'thinking';

const OrbitalGlyph: React.FC<{
  mode: IslandGlyphMode;
  tone: string;
}> = ({ mode, tone }) => {
  const ringSize = mode === 'thinking' ? 34 : 30;
  const bubbleCount = mode === 'thinking' ? 6 : 4;

  return (
    <Box
      sx={{
        position: 'relative',
        width: ringSize,
        height: ringSize,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: mode === 'thinking' ? 8 : 10, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `1px solid ${alpha(tone, mode === 'thinking' ? 0.3 : 0.22)}`,
          opacity: mode === 'thinking' ? 1 : 0.85,
        }}
      />

      {Array.from({ length: bubbleCount }).map((_, index) => {
        const angle = (360 / bubbleCount) * index;
        const radius = mode === 'thinking' ? 14 : 12;
        return (
          <motion.span
            key={index}
            animate={{
              x: [0, Math.cos((angle * Math.PI) / 180) * radius],
              y: [0, Math.sin((angle * Math.PI) / 180) * radius],
              opacity: [0.4, 1, 0.45],
              scale: [0.9, 1.15, 0.9],
            }}
            transition={{
              duration: 2.2 + index * 0.2,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: mode === 'thinking' ? 6 : 5,
              height: mode === 'thinking' ? 6 : 5,
              marginLeft: -3,
              marginTop: -3,
              borderRadius: '50%',
              background: tone,
            }}
          />
        );
      })}

      <motion.div
        animate={{
          scale: mode === 'thinking' ? [1, 0.94, 1] : [1, 1.06, 1],
          rotate: mode === 'typing' ? [0, -8, 8, 0] : 0,
        }}
        transition={{
          duration: mode === 'thinking' ? 2.8 : 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: mode === 'thinking' ? 18 : 16,
          height: mode === 'thinking' ? 18 : 16,
          borderRadius: '50%',
          background: tone,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 2,
            borderRadius: '50%',
            background: '#000',
          }}
        />
      </motion.div>
    </Box>
  );
};

const shortenUserId = (value?: string | null) => {
  if (!value) return 'unknown';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

const ProfilePanelSurface: React.FC<{ onClosePanel: () => void }> = ({ onClosePanel }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { profile: profileFromContext, isLoading } = useProfile();
  const cachedIdentity = user?.$id ? getCachedIdentityById(user.$id) : null;
  const profile = profileFromContext || cachedIdentity || null;
  const previewSource = profile?.avatarUrl || profile?.avatarFileId || profile?.avatar || user?.prefs?.profilePicId || null;
  const profilePreviewUrl = useCachedProfilePreview(previewSource, 160, 160);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    setCopyState('idle');
  }, [profile?.userId, profile?.$id]);

  const username = profile?.username ? String(profile.username).replace(/^@+/, '').toLowerCase() : null;
  const displayName = profile?.displayName || username || user?.name || user?.email || 'Profile';
  const fullUserId = profile?.userId || profile?.$id || user?.$id || null;
  const bio = (profile?.bio || '').trim();
  const shortUserId = shortenUserId(fullUserId);

  const openFullProfile = useCallback(async () => {
    if (!username) return;
    if (profile) {
      stageProfileView(profile, profilePreviewUrl || previewSource || null);
    }
    await router.prefetch(`/u/${encodeURIComponent(username)}`);
    onClosePanel();
    router.push(`/u/${encodeURIComponent(username)}?transition=profile`);
  }, [onClosePanel, profile, previewSource, profilePreviewUrl, router, username]);

  const handleCopyUserId = useCallback(async () => {
    if (!fullUserId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(fullUserId);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1600);
  }, [fullUserId]);

  const handleSignOut = useCallback(() => {
    onClosePanel();
    void logout();
  }, [logout, onClosePanel]);

  if (isLoading && !profile) {
    return (
      <Box sx={{ display: 'grid', gap: 1.25, minWidth: 0, overflowX: 'hidden', overflowY: 'auto', maxHeight: '58vh', pr: 0.5, pb: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.25 }}>
          <Box sx={{ width: 56, height: 6, borderRadius: 999, bgcolor: alpha('#fff', 0.14) }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Skeleton variant="rounded" width={104} height={104} sx={{ borderRadius: '28px', bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton width="48%" height={34} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
            <Skeleton width="30%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
            <Skeleton width="80%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
          </Box>
        </Box>
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: '22px', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ display: 'grid', gap: 0.75 }}>
          <Skeleton variant="rounded" height={48} sx={{ borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Skeleton variant="rounded" height={48} sx={{ borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.05)' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.25, minWidth: 0, overflowX: 'hidden', overflowY: 'auto', maxHeight: '58vh', pr: 0.5, pb: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.25 }}>
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 140 }}
          dragElastic={0.14}
          onDragEnd={(_, info) => {
            if (info.offset.y > 64) {
              void openFullProfile();
            }
          }}
          style={{ touchAction: 'pan-y', cursor: 'grab' }}
        >
          <Box sx={{ width: 56, height: 6, borderRadius: 999, bgcolor: alpha('#fff', 0.14) }} />
        </motion.div>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
        <Box sx={{ flexShrink: 0 }}>
          <IdentityAvatar
            src={profilePreviewUrl || previewSource || undefined}
            alt={displayName}
            fallback={(displayName || 'P')[0]?.toUpperCase() || 'P'}
            size={104}
            borderRadius="28px"
          />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.15rem', lineHeight: 1.05 }} noWrap>
            {displayName}
          </Typography>
          <Typography sx={{ color: alpha('#fff', 0.62), fontWeight: 700, fontSize: '0.86rem', lineHeight: 1.35 }} noWrap>
            @{username || 'profile'}
          </Typography>
          <Typography sx={{ color: alpha('#fff', 0.52), fontFamily: 'var(--font-mono)', fontSize: '0.72rem', mt: 0.75 }} noWrap>
            {shortUserId}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ borderRadius: '22px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.02)', p: 1.5, minWidth: 0 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.56)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.75 }}>
          Bio
        </Typography>
        <Typography sx={{ color: 'white', fontSize: '0.88rem', lineHeight: 1.55, minHeight: 22, wordBreak: 'break-word' }}>
          {bio || 'No bio yet.'}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button
          onClick={handleCopyUserId}
          startIcon={<CopyIcon size={16} />}
          sx={{
            minWidth: 0,
            flex: '1 1 180px',
            justifyContent: 'flex-start',
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.03)',
            color: 'white',
            px: 1.5,
            py: 1.15,
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          {copyState === 'copied' ? 'Copied user id' : `Copy ${shortUserId}`}
        </Button>
        <Button
          onClick={handleSignOut}
          sx={{
            minWidth: 0,
            flex: '1 1 180px',
            borderRadius: '16px',
            bgcolor: 'rgba(255, 77, 77, 0.08)',
            color: '#FF4D4D',
            px: 1.5,
            py: 1.15,
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(255, 77, 77, 0.14)' },
          }}
        >
          Sign out
        </Button>
      </Stack>

      <Button
        onClick={openFullProfile}
        disabled={!username}
        variant="contained"
        sx={{
          borderRadius: '16px',
          px: 2,
          py: 1.25,
          textTransform: 'none',
          fontWeight: 900,
          bgcolor: '#6366F1',
          color: '#000',
          '&:hover': { bgcolor: alpha('#6366F1', 0.86) },
          '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.28)', color: 'rgba(255,255,255,0.6)' },
        }}
      >
        See full profile
      </Button>
    </Box>
  );
};

export const DynamicIslandPanelSurface: React.FC<{
  panel: IslandPanel | null;
  onClosePanel: () => void;
}> = ({ panel, onClosePanel }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const router = useRouter();
  const { user, logout } = useAuth();

  const panelTone = panel === 'profile' ? '#6366F1' : APP_TONES.connect.secondary;
  const panelWidth = isMobile ? 'calc(100vw - 24px)' : 'min(680px, calc(100vw - 48px))';

  if (!panel) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto', width: '100%' }}>
      <motion.div
        key={`panel-${panel}`}
        layout
        initial={{ y: -12, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: -12, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{ pointerEvents: 'auto', width: '100%' }}
      >
        <Paper
          elevation={0}
          sx={{
            width: panelWidth,
            mx: 'auto',
            borderRadius: '30px',
            bgcolor: '#161412',
            border: `1px solid ${alpha(panelTone, 0.28)}`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 0.5, mb: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <motion.div style={{ display: 'inline-flex' }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '14px',
                        display: 'grid',
                        placeItems: 'center',
                        color: panelTone,
                        bgcolor: alpha(panelTone, 0.08),
                        border: `1px solid ${alpha(panelTone, 0.24)}`,
                        }}
                      >
                    {panel === 'profile' ? <UserIcon size={18} /> : <Logo app="connect" size={18} variant="icon" />}
                  </Box>
                </motion.div>
                <Box>
                  <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '0.9rem', lineHeight: 1.1 }}>
                    {panel === 'profile' ? (user?.name || user?.email || 'Profile') : 'Ecosystem apps'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.52), fontWeight: 700 }}>
                    {panel === 'profile' ? 'Profile commands' : 'Jump between apps'}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={onClosePanel}
                aria-label="Close dynamic island"
                size="small"
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '999px',
                  color: alpha('#fff', 0.9),
                  bgcolor: alpha('#fff', 0.06),
                  border: '1px solid rgba(255,255,255,0.08)',
                  flexShrink: 0,
                  '&:hover': { bgcolor: alpha('#fff', 0.12) },
                }}
              >
                <CloseIcon size={16} />
              </IconButton>
            </Box>

            {panel === 'ecosystem' ? (
              <Box sx={{ display: 'grid', gap: 0.75 }}>
                {ECOSYSTEM_APPS.map((app) => {
                  const selected = app.subdomain === 'connect';
                  const logoApp = getLogoApp(app.id);
                  return (
                    <ListItemButton
                      key={app.id}
                      onClick={() => window.location.assign(getEcosystemUrl(app.subdomain))}
                      sx={{
                        borderRadius: '18px',
                        bgcolor: selected ? alpha(app.color, 0.1) : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selected ? alpha(app.color, 0.28) : 'rgba(255,255,255,0.05)'}`,
                        px: 1.5,
                        py: 1.25,
                        gap: 1.25,
                        '&:hover': {
                          bgcolor: alpha(app.color, 0.12),
                          borderColor: alpha(app.color, 0.32),
                        },
                      }}
                    >
                      <Box sx={{ width: 34, height: 34, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: alpha(app.color, 0.12), color: app.color, flexShrink: 0 }}>
                        <Logo app={logoApp} size={16} variant="icon" />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }}>
                          {app.label}
                        </Typography>
                        <Typography sx={{ color: alpha('#fff', 0.56), fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }}>
                          {app.description}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  );
                })}
              </Box>
            ) : (
              <ProfilePanelSurface onClosePanel={onClosePanel} />
            )}
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
};

const DynamicIslandOverlay: React.FC<{
  notifications: IslandNotification[];
  onDismiss: (id: string) => void;
  isMobile: boolean;
  panel: IslandPanel | null;
  onClosePanel: () => void;
}> = ({ notifications, onDismiss, isMobile, panel, onClosePanel }) => {
  const current = panel ? null : notifications[notifications.length - 1];
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const islandRootRef = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { requestSudo } = useSudo();
  const { headerHeight } = useAppChrome();

  const currentTone = current ? getTone(current) : APP_TONES.connect;
  const topOffset = Math.max(12, Math.round(headerHeight / 2 - 26));
  const openSearch = useCallback(() => {
    if (current) return;
    setIsSearchOpen(true);
  }, [current]);
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setQuery('');
    setPeople([]);
    setSearching(false);
  }, []);

  const routeActions = React.useMemo<SearchAction[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      closeSearch();
    };

    const openExternal = (href: string) => () => {
      window.location.assign(href);
      closeSearch();
    };

    return [
      {
        id: 'open-chats',
        kind: 'route',
        title: 'Open chats',
        description: 'Jump to messages and active conversations',
        color: '#F59E0B',
        terms: ['chat', 'chats', 'message', 'messages', 'dm', 'inbox', 'conversation'],
        onSelect: go('/chats'),
        icon: <MessageCircleIcon size={16} />,
      },
      {
        id: 'open-calls',
        kind: 'route',
        title: 'Open calls',
        description: 'Review voice and call activity',
        color: '#A855F7',
        terms: ['call', 'calls', 'phone', 'voice', 'video'],
        onSelect: go('/calls'),
        icon: <PhoneIcon size={16} />,
      },
      {
        id: 'open-settings',
        kind: 'route',
        title: 'Open settings',
        description: 'Adjust identity, privacy, and app preferences',
        color: '#6366F1',
        terms: ['setting', 'settings', 'preferences', 'profile', 'account', 'security'],
        onSelect: go('/settings'),
        icon: <SettingsIcon size={16} />,
      },
      ...ECOSYSTEM_APPS.map((app) => ({
        id: `app-${app.id}`,
        kind: 'route' as const,
        title: `Open ${app.label}`,
        description: app.description,
        color: app.color,
        terms: [app.label.toLowerCase(), app.subdomain, app.id, 'open app', 'launch app'],
        onSelect: openExternal(getEcosystemUrl(app.subdomain)),
        icon: <Logo app={getLogoApp(app.id)} size={16} variant="icon" />,
      })),
    ];
  }, [closeSearch, router]);

  const routeMatches = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) {
      return routeActions.slice(0, 5);
    }

    return routeActions
      .filter((action) => includesAny(text, action.terms))
      .slice(0, 6);
  }, [query, routeActions]);

  const panelTone = panel === 'profile' ? '#6366F1' : APP_TONES.connect.secondary;

  const startDirectChat = useCallback(async (targetUser: any) => {
    if (!user) return;
    const targetUserId = targetUser.userId || targetUser.$id;

    if (!targetUser.publicKey) {
      toast.error(`${targetUser.displayName || targetUser.username} hasn't set up secure chatting yet.`);
      return;
    }

    try {
      const existing = await ChatService.getConversations(user.$id);
      const found = existing.rows.find((conversation: any) => (
        conversation.type === 'direct' &&
        conversation.participants?.includes(targetUserId)
      ));

      if (found) {
        router.push(`/chat/${found.$id}`);
        closeSearch();
        return;
      }
    } catch (error) {
      console.warn('[DynamicIsland] Failed to resolve existing chat:', error);
    }

    requestSudo({
      onSuccess: async () => {
        try {
          await UsersService.ensureProfileForUser(user);
          await ecosystemSecurity.ensureE2EIdentity(user.$id);
          const newConv = await ChatService.createConversation([user.$id, targetUserId], 'direct');
          router.push(`/chat/${newConv.$id}`);
          closeSearch();
        } catch (error: any) {
          console.error('[DynamicIsland] Failed to create chat:', error);
          toast.error(`Failed to open chat: ${error?.message || 'Unknown error'}`);
        }
      },
    });
  }, [closeSearch, requestSudo, router, user]);

  useEffect(() => {
    if (!current) {
      setIsExpanded(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    closeSearch();
    requestAnimationFrame(() => setIsExpanded(false));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onDismiss(current.id);
    }, current.duration || 6000);

    controls.start({
      y: [0, -2, 0],
      transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [closeSearch, controls, current, onDismiss]);

  useEffect(() => {
    if (!isSearchOpen || current) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [current, isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen || current) return;

    const text = query.trim().toLowerCase();
    let active = true;

    if (!text) {
      setPeople([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (text.length < 2) {
        setPeople([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const res = await UsersService.searchUsers(text);
        if (!active) return;
        const rows = (res.rows || []).filter((candidate: any) => (candidate.userId || candidate.$id) !== user?.$id);
        rows.forEach((candidate: any) => seedIdentityCache(candidate));
        setPeople(rows.slice(0, 5));
      } catch (error) {
        if (active) {
          console.warn('[DynamicIsland] People search failed:', error);
          setPeople([]);
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [current, isSearchOpen, query, user?.$id]);

  useEffect(() => {
    if (panel || !isSearchOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !islandRootRef.current || islandRootRef.current.contains(target)) return;

      if (panel) {
        onClosePanel();
      }
      if (isSearchOpen) {
        closeSearch();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [closeSearch, isSearchOpen, onClosePanel, panel]);

  if (panel) {
    return null;
  }

  const handleSearchSubmit = () => {
    if (routeMatches.length > 0) {
      routeMatches[0].onSelect();
      return;
    }

    if (people.length > 0) {
      void startDirectChat(people[0]);
      return;
    }

    router.push('/chats');
    closeSearch();
  };

  const queryText = query.trim();
  const searchMode: IslandGlyphMode = !queryText ? 'idle' : searching ? 'thinking' : 'typing';

  const currentIcon = current ? (
    current.type === 'success' ? <SuccessIcon fontSize="small" /> :
    current.type === 'error' ? <ErrorIcon fontSize="small" /> :
    current.type === 'warning' ? <WarningIcon fontSize="small" /> :
    current.type === 'pro' ? <ProIcon fontSize="small" /> :
    current.type === 'suggestion' ? <IdeaIcon fontSize="small" /> :
    current.type === 'connect' ? <ConnectIcon fontSize="small" /> :
    <InfoIcon fontSize="small" />
  ) : (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: APP_TONES.connect.secondary,
      }}
    />
  );

  const islandFrame = current
    ? {
        border: `1px solid ${alpha(currentTone.secondary, current.majestic ? 0.42 : 0.28)}`,
        backgroundColor: alpha(currentTone.secondary, current.majestic ? 0.08 : 0.05),
      }
    : {
      border: `1px solid ${alpha(APP_TONES.connect.secondary, 0.24)}`,
      backgroundColor: alpha(APP_TONES.connect.secondary, 0.05),
      };

  const searchWidth = isMobile ? 'calc(100vw - 24px)' : 'min(560px, calc(100vw - 48px))';
  const panelWidth = isMobile ? 'calc(100vw - 24px)' : 'min(680px, calc(100vw - 48px))';
  const restingSize = '42px';
  const collapsedSize = '52px';
  const islandHeight = current || isSearchOpen ? 52 : 42;
  const islandWidth = current || isSearchOpen ? (isExpanded ? searchWidth : collapsedSize) : restingSize;

  const containerWidth = panel
    ? panelWidth
    : current
    ? (isExpanded ? searchWidth : restingSize)
    : isSearchOpen
      ? searchWidth
      : restingSize;

  return (
    <Box
      ref={islandRootRef}
      sx={{
        position: 'fixed',
        top: topOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        pointerEvents: 'none',
        width: containerWidth,
      }}
    >
      <AnimatePresence mode="wait">
        {panel ? (
          <motion.div
            key={`panel-${panel}`}
            layout
            initial={{ y: -24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -24, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{ pointerEvents: 'auto' }}
          >
            <Paper
              elevation={0}
              sx={{
                width: panelWidth,
                borderRadius: '30px',
                bgcolor: '#161412',
                border: `1px solid ${alpha(panelTone, 0.28)}`,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 0.5, mb: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <motion.div style={{ display: 'inline-flex' }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: '14px',
                          display: 'grid',
                          placeItems: 'center',
                          color: panelTone,
                          bgcolor: alpha(panelTone, 0.08),
                          border: `1px solid ${alpha(panelTone, 0.24)}`,
                        }}
                      >
                        {panel === 'profile' ? <UserIcon size={18} /> : <SparklesIcon size={18} />}
                      </Box>
                    </motion.div>
                    <Box>
                      <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '0.9rem', lineHeight: 1.1 }}>
                        {panel === 'profile' ? (user?.name || user?.email || 'Profile') : 'Ecosystem apps'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.52), fontWeight: 700 }}>
                        {panel === 'profile' ? 'Profile commands' : 'Jump between apps'}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    onClick={onClosePanel}
                    sx={{
                      minWidth: 0,
                      width: 34,
                      height: 34,
                      borderRadius: '999px',
                      color: alpha('#fff', 0.66),
                      bgcolor: alpha('#fff', 0.04),
                    }}
                  >
                    <CloseIcon size={16} />
                  </Button>
                </Box>

                {panel === 'ecosystem' ? (
                  <Box sx={{ display: 'grid', gap: 0.75 }}>
                    {ECOSYSTEM_APPS.map((app) => {
                      const selected = app.subdomain === 'connect';
                      return (
                        <ListItemButton
                          key={app.id}
                          onClick={() => window.location.assign(getEcosystemUrl(app.subdomain))}
                          sx={{
                            borderRadius: '18px',
                            bgcolor: selected ? alpha(app.color, 0.1) : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selected ? alpha(app.color, 0.28) : 'rgba(255,255,255,0.05)'}`,
                            px: 1.5,
                            py: 1.25,
                            gap: 1.25,
                            '&:hover': {
                              bgcolor: alpha(app.color, 0.12),
                              borderColor: alpha(app.color, 0.32),
                            },
                          }}
                        >
                          <Box sx={{ width: 34, height: 34, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: alpha(app.color, 0.12), color: app.color, flexShrink: 0 }}>
                            <SparklesIcon size={16} />
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }}>
                              {app.label}
                            </Typography>
                            <Typography sx={{ color: alpha('#fff', 0.56), fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }}>
                              {app.description}
                            </Typography>
                          </Box>
                        </ListItemButton>
                      );
                    })}
                  </Box>
                ) : (
                  <ProfilePanelSurface onClosePanel={onClosePanel} />
                )}
              </Box>
            </Paper>
          </motion.div>
        ) : current ? (
          <motion.div
            key={current.id}
            layout
            initial={{ y: -40, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -40, scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onHoverStart={() => setIsExpanded(true)}
            onHoverEnd={() => setIsExpanded(false)}
            onClick={() => setIsExpanded((value) => !value)}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          >
            <motion.div
              layout
              animate={controls}
              style={{
                height: islandHeight,
                width: islandWidth,
                borderRadius: '999px',
                background: current ? '#161412' : '#000',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'stretch',
                flexDirection: 'column',
                position: 'relative',
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                ...islandFrame,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  height: islandHeight,
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  gap: 1.5,
                }}
              >
                <Box sx={{ color: currentTone.secondary, display: 'flex', flexShrink: 0 }}>
                  {currentIcon}
                </Box>

                {isExpanded && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'white',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          fontFamily: 'var(--font-space-grotesk)',
                          lineHeight: 1.15,
                        }}
                        noWrap={!isExpanded}
                      >
                        {current.personal ? `Hey, ${current.title}` : current.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: alpha('#fff', 0.6),
                          mt: 0.25,
                          fontWeight: 600,
                          lineHeight: 1.4,
                        }}
                      >
                        {current.message || 'Tap to expand'}
                      </Typography>
                    </motion.div>
                  </AnimatePresence>
                )}

                {!isExpanded && (
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                    {current ? (
                      [0, 1, 2].map((index) => (
                        <motion.div
                          key={index}
                          animate={{ scale: [1, 1.35, 1], opacity: [0.35, 1, 0.35] }}
                          transition={{ duration: 2, repeat: Infinity, delay: index * 0.22 }}
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            background: currentTone.secondary,
                          }}
                        />
                      ))
                    ) : (
                      <OrbitalGlyph mode={searchMode} tone={APP_TONES.connect.secondary} />
                    )}
                  </Box>
                )}
              </Box>
            </motion.div>
          </motion.div>
        ) : isSearchOpen ? (
          <motion.div
            key="search-island"
            layout
            initial={{ y: -20, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -20, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            style={{ pointerEvents: 'auto' }}
          >
            <Paper
              elevation={0}
              sx={{
                width: searchWidth,
                borderRadius: '30px',
                bgcolor: '#161412',
                border: `1px solid ${alpha(APP_TONES.connect.secondary, 0.28)}`,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: searchMode === 'thinking' ? '16px' : '999px',
                        display: 'grid',
                        placeItems: 'center',
                        color: APP_TONES.connect.secondary,
                        bgcolor: alpha(APP_TONES.connect.secondary, 0.08),
                        border: `1px solid ${alpha(APP_TONES.connect.secondary, searchMode === 'thinking' ? 0.34 : 0.22)}`,
                        flexShrink: 0,
                        transition: 'border-radius 320ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                  >
                    <AnimatePresence mode="wait">
                      {searchMode === 'idle' ? (
                        <motion.div
                          key="idle-glyph"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SearchIcon size={18} />
                        </motion.div>
                      ) : searchMode === 'typing' ? (
                        <motion.div
                          key="typing-glyph"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2 }}
                        >
                          <OrbitalGlyph mode="typing" tone={APP_TONES.connect.secondary} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="thinking-glyph"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2 }}
                        >
                          <OrbitalGlyph mode="thinking" tone={APP_TONES.connect.secondary} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Box>
                  <TextField
                    inputRef={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        closeSearch();
                      }
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSearchSubmit();
                      }
                    }}
                    placeholder="Search chats, people, apps..."
                    variant="standard"
                    fullWidth
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        color: 'white',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        '& .MuiInputBase-input::placeholder': {
                          color: alpha('#fff', 0.42),
                          opacity: 1,
                        },
                      },
                    }}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    onClick={closeSearch}
                    sx={{
                      minWidth: 0,
                      width: 36,
                      height: 36,
                      borderRadius: '999px',
                      color: alpha('#fff', 0.62),
                      bgcolor: alpha('#fff', 0.04),
                    }}
                  >
                    <CloseIcon size={16} />
                  </Button>
                </Box>

                <Box sx={{ mt: 1.5, display: 'grid', gap: 1.25 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: alpha('#fff', 0.42),
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        px: 0.75,
                      }}
                    >
                      Offline suggestions
                    </Typography>
                    <List sx={{ display: 'grid', gap: 0.75, mt: 0.75, p: 0 }}>
                      {routeMatches.map((action) => (
                        <ListItemButton
                          key={action.id}
                          onClick={action.onSelect}
                          sx={{
                            borderRadius: '18px',
                            bgcolor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            px: 1.5,
                            py: 1.25,
                            gap: 1.25,
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.05)',
                              borderColor: alpha(action.color, 0.28),
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: '12px',
                              display: 'grid',
                              placeItems: 'center',
                              color: action.color,
                              bgcolor: alpha(action.color, 0.12),
                              flexShrink: 0,
                            }}
                          >
                            {action.icon}
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }}>
                              {action.title}
                            </Typography>
                            <Typography sx={{ color: alpha('#fff', 0.56), fontWeight: 600, fontSize: '0.76rem', lineHeight: 1.35 }}>
                              {action.description}
                            </Typography>
                          </Box>
                          <ArrowRightIcon size={15} color={action.color} />
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: alpha('#fff', 0.42),
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        px: 0.75,
                      }}
                    >
                      People
                    </Typography>

                    <Box sx={{ mt: 0.75, display: 'grid', gap: 0.75 }}>
                      {searching && (
                        <Box sx={{ px: 1, py: 1.25, color: alpha('#fff', 0.52) }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>Searching locally first...</Typography>
                        </Box>
                      )}

                      {people.map((person) => {
                        const avatar = person.avatar;
                        return (
                          <ListItemButton
                            key={person.$id || person.userId}
                            onClick={() => void startDirectChat(person)}
                            sx={{
                              borderRadius: '18px',
                              bgcolor: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              px: 1.5,
                              py: 1.1,
                              gap: 1.25,
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                borderColor: alpha('#F59E0B', 0.28),
                              },
                            }}
                          >
                            <ListItemAvatar sx={{ minWidth: 0 }}>
                              <Avatar
                                src={avatar || undefined}
                                sx={{
                                  width: 34,
                                  height: 34,
                                  bgcolor: alpha('#F59E0B', 0.1),
                                  color: '#F59E0B',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                }}
                              >
                                {!avatar && String(person.displayName || person.username || '?').charAt(0).toUpperCase()}
                              </Avatar>
                            </ListItemAvatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.15 }} noWrap>
                                {person.displayName || person.username || 'Unknown'}
                              </Typography>
                              <Typography sx={{ color: alpha('#fff', 0.56), fontWeight: 600, fontSize: '0.76rem' }} noWrap>
                                @{person.username || person.userId || person.$id}
                              </Typography>
                            </Box>
                            <ArrowRightIcon size={15} color="#F59E0B" />
                          </ListItemButton>
                        );
                      })}

                      {!searching && query.trim().length >= 2 && people.length === 0 && (
                        <Box sx={{ px: 1, py: 1.25, color: alpha('#fff', 0.52) }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>No local matches yet.</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        ) : (
          <motion.div
            key="idle-island"
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={openSearch}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#161412',
                position: 'relative',
                overflow: 'hidden',
                ...islandFrame,
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.06, 1],
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  color: APP_TONES.connect.secondary,
                  display: 'flex',
                }}
              >
                <SearchIcon size={18} />
              </motion.div>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};
