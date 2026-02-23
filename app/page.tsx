'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Feed } from '@/components/social/Feed';
import SudoGuard from '@/components/common/SudoGuard';
import { Box, Typography, Container, Button, CircularProgress } from '@mui/material';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, login, isAuthenticating } = useAuth();
  const router = useRouter();

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <SudoGuard>
          <Feed />
        </SudoGuard>
      </Container>
    </AppShell>
  );
}
