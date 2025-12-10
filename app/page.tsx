'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Feed } from '@/components/social/Feed';
import { Box, Typography, Container } from '@mui/material';

export default function Home() {
  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>Home</Typography>
        <Feed />
      </Container>
    </AppShell>
  );
}
