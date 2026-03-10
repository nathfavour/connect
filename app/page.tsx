'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Feed } from '@/components/social/Feed';
import { Container } from '@mui/material';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user: _user } = useAuth();
  const _router = useRouter();

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Feed />
      </Container>
    </AppShell>
  );
}
