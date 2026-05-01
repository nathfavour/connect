'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
} from '@mui/material';
import {
  CheckSquare as TasksIcon,
  FileText as FormIcon,
  Zap as EventsIcon,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function BottomNav() {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // Determine active value based on pathname
  const getValue = () => {
    if (pathname.startsWith('/tasks')) return 'tasks';
    if (pathname.startsWith('/forms')) return 'forms';
    if (pathname.startsWith('/events')) return 'events';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'tasks'; // Default
  };

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    router.push(`/${newValue}`);
  };

  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: '400px',
        zIndex: theme.zIndex.appBar + 1,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '24px',
          overflow: 'hidden',
          backgroundColor: 'rgba(11, 9, 8, 0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <BottomNavigation
          value={getValue()}
          onChange={handleChange}
          showLabels={false}
          sx={{
            backgroundColor: 'transparent',
            height: 72,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '0',
              color: 'rgba(255, 255, 255, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-selected': {
                color: '#A855F7',
                '& .lucide': {
                  transform: 'scale(1.2) translateY(-2px)',
                  filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))',
                }
              },
            },
          }}
        >
          <BottomNavigationAction
            value="tasks"
            icon={<TasksIcon size={24} strokeWidth={1.5} className="lucide" />}
          />
          <BottomNavigationAction
            value="forms"
            icon={<FormIcon size={24} strokeWidth={1.5} className="lucide" />}
          />
          <BottomNavigationAction
            value="events"
            icon={<EventsIcon size={24} strokeWidth={1.5} className="lucide" />}
          />
          <BottomNavigationAction
            value="settings"
            icon={<SettingsIcon size={24} strokeWidth={1.5} className="lucide" />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
