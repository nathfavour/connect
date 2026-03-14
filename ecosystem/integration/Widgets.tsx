"use client";

import React from 'react';
import { Box, TextField, Paper, Typography, alpha, LinearProgress } from '@mui/material';
import { Description as NoteIcon, Shield as ShieldIcon, Timer as TimerIcon } from '@mui/icons-material';

const QuickNote = () => {
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#6366F1', 0.1), color: '#6366F1' }}><NoteIcon sx={{ fontSize: 20 }} /></Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Quick Note</Typography>
            </Box>
            <TextField fullWidth placeholder="Save from chat..." variant="standard" InputProps={{ disableUnderline: true, sx: { color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8125rem' } }} />
        </Paper>
    );
};

import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { KeychainService } from '@/lib/appwrite/keychain';
import { useAuth } from '@/lib/auth';
import SudoModal from '@/components/overlays/SudoModal';
import { useEffect } from 'react';

const VaultStatus = () => {
    const { user } = useAuth();
    const [isInitialized, setIsInitialized] = React.useState<boolean | null>(null);
    const [isLocked, setIsLocked] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [sudoIntent, setSudoIntent] = React.useState<"unlock" | "initialize" | "reset">("unlock");

    useEffect(() => {
        if (user?.$id) {
            KeychainService.listKeychainEntries(user.$id).then(entries => {
                setIsInitialized(entries.some((e: any) => e.type === 'password'));
            });
        }
        setIsLocked(!ecosystemSecurity.status.isUnlocked);
    }, [user?.$id, ecosystemSecurity.status.isUnlocked]);

    const handleAction = () => {
        if (isInitialized === false) {
            setSudoIntent("initialize");
        } else {
            setSudoIntent("unlock");
        }
        setIsModalOpen(true);
    };

    if (isInitialized === null) return null;

    return (
        <>
            <Paper 
                elevation={0} 
                onClick={handleAction}
                sx={{ 
                    p: 2, 
                    borderRadius: '16px', 
                    bgcolor: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B' }}><ShieldIcon sx={{ fontSize: 20 }} /></Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>
                        {isInitialized === false ? 'Setup Vault' : (isLocked ? 'Vault Locked' : 'Vault Active')}
                    </Typography>
                </Box>
                <Typography sx={{ 
                    fontSize: '0.75rem', 
                    color: isInitialized === false ? '#F59E0B' : (isLocked ? '#ef4444' : '#10b981'), 
                    fontWeight: 800 
                }}>
                    {isInitialized === false ? 'REQUIRED' : (isLocked ? 'LOCKED' : 'SECURE')}
                </Typography>
            </Paper>

            <SudoModal 
                isOpen={isModalOpen}
                intent={sudoIntent}
                onSuccess={() => {
                    setIsModalOpen(false);
                    if (user?.$id) {
                        KeychainService.listKeychainEntries(user.$id).then(entries => {
                            setIsInitialized(entries.some((e: any) => e.type === 'password'));
                        });
                    }
                }}
                onCancel={() => setIsModalOpen(false)}
            />
        </>
    );
};

const FocusStatus = () => {
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}><TimerIcon sx={{ fontSize: 20 }} /></Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Flow Timer</Typography>
            </Box>
            <LinearProgress variant="determinate" value={60} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }} />
        </Paper>
    );
};

import { MiniChat } from '../contributions/MiniChat';
import { Grid } from '@mui/material';

export const EcosystemWidgets = () => {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 900, letterSpacing: '0.2em', mb: 2, display: 'block' }}>Ecosystem Status</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}><QuickNote /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><MiniChat /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><VaultStatus /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><FocusStatus /></Grid>
            </Grid>
        </Box>
    );
};
