'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { 
    Box, 
    Typography, 
    Paper, 
    Button, 
    TextField, 
    Stack, 
    Switch, 
    FormControlLabel, 
    Divider,
    IconButton,
    Alert,
    CircularProgress,
    alpha
} from '@mui/material';
import { 
    Lock, 
    Shield, 
    Key, 
    Fingerprint, 
    Smartphone,
    ChevronRight,
    RefreshCw,
    ShieldAlert
} from 'lucide-react';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { MasterPassModal } from '@/components/chat/MasterPassModal';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
    const { user } = useAuth();
    const [isUnlocked, setIsUnlocked] = useState(ecosystemSecurity.status.isUnlocked);
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isPinSet, setIsPinSet] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setIsPinSet(ecosystemSecurity.isPinSet());
        
        const interval = setInterval(() => {
            if (ecosystemSecurity.status.isUnlocked !== isUnlocked) {
                setIsUnlocked(ecosystemSecurity.status.isUnlocked);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isUnlocked]);

    const handleSetPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) {
            setMessage({ type: 'error', text: 'PIN must be 4 digits.' });
            return;
        }
        if (pin !== confirmPin) {
            setMessage({ type: 'error', text: 'PINs do not match.' });
            return;
        }

        if (!isUnlocked) {
            setUnlockModalOpen(true);
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const success = await ecosystemSecurity.setupPin(pin);
            if (success) {
                setMessage({ type: 'success', text: 'PIN setup successfully!' });
                setIsPinSet(true);
                setPin('');
                setConfirmPin('');
            } else {
                setMessage({ type: 'error', text: 'Failed to setup PIN. Please ensure vault is unlocked.' });
            }
        } catch (err: unknown) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell>
            <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, fontFamily: 'var(--font-space-grotesk)' }}>
                    Settings
                </Typography>

                <Stack spacing={4}>
                    {/* Security Section */}
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Shield size={20} color="#00F0FF" /> Security & Privacy
                        </Typography>
                        
                        <Paper sx={{ 
                            p: 3, 
                            borderRadius: '24px', 
                            bgcolor: 'rgba(255, 255, 255, 0.02)', 
                            border: '1px solid rgba(255, 255, 255, 0.05)' 
                        }}>
                            <Stack spacing={3}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Vault Status</Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.6 }}>Current encryption state of your session</Typography>
                                    </Box>
                                    <Button 
                                        variant={isUnlocked ? "outlined" : "contained"}
                                        onClick={() => isUnlocked ? ecosystemSecurity.lock() : setUnlockModalOpen(true)}
                                        color={isUnlocked ? "inherit" : "primary"}
                                        startIcon={isUnlocked ? <Lock size={16} /> : <Shield size={16} />}
                                        sx={{ borderRadius: '12px' }}
                                    >
                                        {isUnlocked ? "Lock Vault" : "Unlock Vault"}
                                    </Button>
                                </Box>

                                <Divider sx={{ opacity: 0.05 }} />

                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Quick Unlock (PIN)</Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
                                        Set a 4-digit PIN for faster access to your encrypted chats without entering your master password every time.
                                    </Typography>

                                    {message && (
                                        <Alert severity={message.type} sx={{ mb: 3, borderRadius: '12px' }}>
                                            {message.text}
                                        </Alert>
                                    )}

                                    <Box component="form" onSubmit={handleSetPin} sx={{ maxWidth: 300 }}>
                                        <Stack spacing={2}>
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="New 4-Digit PIN"
                                                value={pin}
                                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                variant="filled"
                                                inputProps={{ maxLength: 4, inputMode: 'numeric' }}
                                                InputProps={{ disableUnderline: true, sx: { borderRadius: '12px' } }}
                                            />
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="Confirm PIN"
                                                value={confirmPin}
                                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                variant="filled"
                                                inputProps={{ maxLength: 4, inputMode: 'numeric' }}
                                                InputProps={{ disableUnderline: true, sx: { borderRadius: '12px' } }}
                                            />
                                            <Button 
                                                fullWidth
                                                variant="contained" 
                                                type="submit"
                                                disabled={loading || pin.length !== 4 || pin !== confirmPin}
                                                sx={{ 
                                                    borderRadius: '12px', 
                                                    py: 1.5, 
                                                    fontWeight: 700,
                                                    bgcolor: isPinSet ? alpha('#00F0FF', 0.1) : 'primary.main',
                                                    color: isPinSet ? '#00F0FF' : 'black',
                                                    border: isPinSet ? '1px solid #00F0FF' : 'none',
                                                    '&:hover': { bgcolor: isPinSet ? alpha('#00F0FF', 0.2) : alpha('#00F0FF', 0.8) }
                                                }}
                                            >
                                                {loading ? <CircularProgress size={24} color="inherit" /> : (isPinSet ? "Update PIN" : "Setup PIN")}
                                            </Button>
                                        </Stack>
                                    </Box>
                                </Box>
                            </Stack>
                        </Paper>
                    </Box>

                    {/* App Settings */}
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Smartphone size={20} color="#00F0FF" /> App Preferences
                        </Typography>
                        <Paper sx={{ 
                            p: 3, 
                            borderRadius: '24px', 
                            bgcolor: 'rgba(255, 255, 255, 0.02)', 
                            border: '1px solid rgba(255, 255, 255, 0.05)' 
                        }}>
                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={<Switch defaultChecked color="primary" />}
                                    label={
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>Push Notifications</Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.6 }}>Get notified of new messages</Typography>
                                        </Box>
                                    }
                                    sx={{ justifyContent: 'space-between', width: '100%', ml: 0, flexDirection: 'row-reverse' }}
                                />
                                <Divider sx={{ opacity: 0.05 }} />
                                <FormControlLabel
                                    control={<Switch defaultChecked color="primary" />}
                                    label={
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>Active Status</Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.6 }}>Show when you are online</Typography>
                                        </Box>
                                    }
                                    sx={{ justifyContent: 'space-between', width: '100%', ml: 0, flexDirection: 'row-reverse' }}
                                />
                            </Stack>
                        </Paper>
                    </Box>
                </Stack>
            </Box>

            <MasterPassModal 
                open={unlockModalOpen}
                onClose={() => setUnlockModalOpen(false)}
                onSuccess={() => {
                    setIsUnlocked(true);
                    if (pin.length === 4 && pin === confirmPin) {
                        // Retry setup if user was in middle of it
                        ecosystemSecurity.setupPin(pin).then(success => {
                            if (success) {
                                setMessage({ type: 'success', text: 'PIN setup successfully!' });
                                setIsPinSet(true);
                                setPin('');
                                setConfirmPin('');
                            }
                        });
                    }
                }}
            />
        </AppShell>
    );
}
