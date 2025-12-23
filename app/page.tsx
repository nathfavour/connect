'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Feed } from '@/components/social/Feed';
import { Box, Typography, Container } from '@mui/material';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/chats');
    }
  }, [user, router]);

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>Home</Typography>
        <Feed />
      </Container>
    </AppShell>
  );
}
