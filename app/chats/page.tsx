'use client';

import { AppShell } from '@/components/layout/AppShell';
import { UserSearch } from '@/components/search/UserSearch';
import { ChatList } from '@/components/chat/ChatList';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppShell>
      <Box sx={{ display: 'flex', height: '100%' }}>
        <Box sx={{ 
            width: isMobile ? '100%' : 350, 
            borderRight: isMobile ? 0 : 1, 
            borderColor: 'divider', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
          <ChatList />
        </Box>
        {!isMobile && (
            <Box sx={{ flex: 1, p: 3 }}>
              <Typography variant="h5" fontWeight="bold" mb={3}>Find People</Typography>
              <UserSearch />
            </Box>
        )}
      </Box>
    </AppShell>
  );
}
