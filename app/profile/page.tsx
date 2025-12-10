'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Profile } from '@/components/profile/Profile';
import { Container } from '@mui/material';

export default function ProfilePage() {
    return (
        <AppShell>
            <Container maxWidth="lg" sx={{ py: 3 }}>
                <Profile />
            </Container>
        </AppShell>
    );
}
