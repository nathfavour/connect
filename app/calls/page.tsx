'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CallHistory } from '@/components/call/CallHistory';
import { CallActionModal } from '@/components/call/CallActionModal';
import { Box, Typography, Container, CircularProgress, Fab, Tooltip } from '@mui/material';
import { Phone, Plus } from 'lucide-react';
import { Suspense } from 'react';

export default function CallsPage() {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <AppShell>
            <Container maxWidth="md" sx={{ py: 3, position: 'relative', minHeight: '100vh' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold">Call History</Typography>
                    <Tooltip title="New Call">
                        <Fab 
                            size="medium" 
                            color="primary" 
                            onClick={() => setModalOpen(true)}
                            sx={{ bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' } }}
                        >
                            <Plus size={24} />
                        </Fab>
                    </Tooltip>
                </Box>
                
                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}>
                    <CallHistory />
                </Suspense>

                <CallActionModal open={modalOpen} onClose={() => setModalOpen(false)} />
            </Container>
        </AppShell>
    );
}
