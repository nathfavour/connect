'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Box, Typography, Stack, IconButton, useTheme, useMediaQuery, Button } from '@mui/material';
import { motion, AnimatePresence, useSpring, useTransform, useAnimation } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { 
  CheckCircle as SuccessIcon, 
  Error as ErrorIcon, 
  Info as InfoIcon, 
  Warning as WarningIcon,
  Close as CloseIcon,
  Star as ProIcon,
  AutoAwesome as SparklesIcon,
  EmojiObjects as IdeaIcon,
  Message as ConnectIcon,
  Assignment as TaskIcon,
  Description as NoteIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';

export type IslandType = 'success' | 'error' | 'warning' | 'info' | 'pro' | 'system' | 'suggestion' | 'connect';

export interface IslandNotification {
  id: string;
  type: IslandType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  majestic?: boolean;
  shape?: 'island' | 'ball' | 'pill';
  personal?: boolean;
}

interface IslandContextType {
  showIsland: (notification: Omit<IslandNotification, 'id'>) => void;
  dismissIsland: (id: string) => void;
}

const IslandContext = createContext<IslandContextType | undefined>(undefined);

export function useIsland() {
  const context = useContext(IslandContext);
  if (!context) {
    throw new Error('useIsland must be used within an IslandProvider');
  }
  return context;
}

export const IslandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<IslandNotification[]>([]);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const showIsland = useCallback((notification: Omit<IslandNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newNotif = { ...notification, id, duration: notification.duration || (notification.majestic ? 10000 : 6000) };
    setNotifications(prev => [...prev, newNotif]);
  }, []);

  const dismissIsland = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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
            personal: !!userName
          },
          {
            type: 'connect' as IslandType,
            title: userName || "Vault Secure",
            message: "Your messages are end-to-end encrypted with your Kylrix Vault master password.",
            action: { label: "Security Status", onClick: () => {} },
            majestic: true,
            personal: !!userName
          },
          {
            type: 'suggestion' as IslandType,
            title: "Thinking space",
            message: "Use 'Saved Messages' to store ideas, snippets, and secrets for yourself.",
            action: { label: "Open Vault", onClick: () => {} }
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
    <IslandContext.Provider value={{ showIsland, dismissIsland }}>
      {children}
      <DynamicIslandOverlay notifications={notifications} onDismiss={dismissIsland} isMobile={isMobile} />
    </IslandContext.Provider>
  );
};

const DynamicIslandOverlay: React.FC<{ 
  notifications: IslandNotification[], 
  onDismiss: (id: string) => void,
  isMobile: boolean 
}> = ({ notifications, onDismiss, isMobile }) => {
  const current = notifications[notifications.length - 1];
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controls = useAnimation();
  const pathname = usePathname();

  const isHiddenRoute = pathname?.includes('/call/');

  useEffect(() => {
    if (current) {
      setIsExpanded(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(() => {
        onDismiss(current.id);
      }, current.duration || 6000);

      // Float animation
      controls.start({
        y: [0, -3, 0],
        transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
      });
    }
  }, [current, onDismiss, controls]);

  if (!current || isHiddenRoute) return null;

  const getTypeStyle = () => {
    switch (current.type) {
      case 'success': return { color: '#00F5FF', icon: <SuccessIcon fontSize="small" /> };
      case 'error': return { color: '#FF3B30', icon: <ErrorIcon fontSize="small" /> };
      case 'pro': return { color: '#FFD700', icon: <ProIcon fontSize="small" /> };
      case 'warning': return { color: '#FF9500', icon: <WarningIcon fontSize="small" /> };
      case 'suggestion': return { color: '#A855F7', icon: <IdeaIcon fontSize="small" /> };
      case 'connect': return { color: '#00F5FF', icon: <ConnectIcon fontSize="small" /> };
      default: return { color: '#00F5FF', icon: <InfoIcon fontSize="small" /> };
    }
  };

  const style = getTypeStyle();

  return (
    <>
      {current.majestic && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.12) 0%, transparent 60%)',
            pointerEvents: 'none', zIndex: 9999
          }}
        />
      )}

      <Box sx={{ position: 'fixed', top: isMobile ? 12 : 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, pointerEvents: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ y: -100, scale: 0.8, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -100, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onHoverStart={() => setIsExpanded(true)}
            onHoverEnd={() => setIsExpanded(false)}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          >
            <motion.div
              animate={controls}
              style={{
                width: isExpanded ? (isMobile ? '340px' : '420px') : (isMobile ? (current.shape === 'ball' ? '44px' : '180px') : (current.shape === 'ball' ? '50px' : '240px')),
                height: isExpanded ? 'auto' : (current.shape === 'ball' ? (isMobile ? '44px' : '50px') : '44px'),
                borderRadius: isExpanded ? '28px' : (current.shape === 'ball' ? '50%' : '22px'),
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(32px)',
                border: current.majestic ? '1.5px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: current.majestic ? '0 0 30px rgba(0, 240, 255, 0.3)' : '0 12px 48px rgba(0,0,0,0.5)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {!isExpanded && current.shape !== 'ball' && (
                <Box sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 0.6 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      style={{ width: 3, height: 3, borderRadius: '50%', background: style.color }} />
                  ))}
                </Box>
              )}

              <Box sx={{ height: 44, display: 'flex', alignItems: 'center', px: 2, gap: 1.5, opacity: isExpanded ? 0 : 1, transition: 'opacity 0.2s', width: '100%', position: isExpanded ? 'absolute' : 'relative', justifyContent: current.shape === 'ball' ? 'center' : 'flex-start' }}>
                <Box sx={{ color: style.color, display: 'flex' }}>{style.icon}</Box>
                {current.shape !== 'ball' && (
                  <AnimatePresence mode="wait">
                    <motion.div key={current.title} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', fontFamily: 'var(--font-space-grotesk)' }}>
                        {current.personal ? `Hey, ${current.title}` : current.title}
                      </Typography>
                    </motion.div>
                  </AnimatePresence>
                )}
              </Box>

              <Box sx={{ p: 2.5, opacity: isExpanded ? 1 : 0, transition: 'opacity 0.3s 0.1s', display: isExpanded ? 'block' : 'none' }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: `${style.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: style.color, border: `1px solid ${style.color}30` }}>
                      {style.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'white', fontWeight: 900, fontFamily: 'var(--font-space-grotesk)', fontSize: '1rem', lineHeight: 1.2 }}>{current.title}</Typography>
                      {current.majestic && <Typography variant="caption" sx={{ color: style.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}>Ecosystem Status</Typography>}
                    </Box>
                  </Stack>
                  {current.message && <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, fontSize: '0.875rem' }}>{current.message}</Typography>}
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={(e) => { e.stopPropagation(); onDismiss(current.id); }} sx={{ color: 'rgba(255, 255, 255, 0.4)', textTransform: 'none', fontWeight: 700 }}>Later</Button>
                    {current.action && <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); current.action?.onClick(); onDismiss(current.id); }}
                      sx={{ background: style.color, color: 'black', fontWeight: 900, borderRadius: '10px', textTransform: 'none' }}>{current.action.label}</Button>}
                  </Stack>
                </Stack>
              </Box>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </Box>
    </>
  );
};