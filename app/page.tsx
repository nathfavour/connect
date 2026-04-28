'use client';

import React, { useState } from 'react';
import { Container, Tabs, Tab, Box } from '@mui/material';
import { TrendingUp, MessageCircle, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Feed } from '@/components/social/Feed';

export default function Home() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Box sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
          mb: 3,
          position: 'sticky',
          top: 0,
          bgcolor: '#0A0908',
          zIndex: 10,
          pt: 1
        }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': { bgcolor: '#F59E0B', height: 3, borderRadius: '3px 3px 0 0' },
              '& .MuiTab-root': { 
                fontWeight: 800, 
                color: 'text.disabled', 
                textTransform: 'none',
                fontSize: '0.95rem',
                minHeight: 56,
                '&.Mui-selected': { color: 'white' } 
              }
            }}
          >
            <Tab 
              icon={<MessageCircle size={18} />} 
              iconPosition="start" 
              label="For You" 
            />
            <Tab 
              icon={<TrendingUp size={18} />} 
              iconPosition="start" 
              label="Trending" 
            />
            <Tab 
              icon={<Search size={18} />} 
              iconPosition="start" 
              label="Search" 
            />
          </Tabs>
        </Box>

        {tabValue === 2 ? (
          <Feed view="search" />
        ) : (
          <Feed view={tabValue === 0 ? 'personal' : 'trending'} />
        )}
      </Container>
    </AppShell>
  );
}
