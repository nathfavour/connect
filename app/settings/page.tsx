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
    alpha,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme
} from '@mui/material';
import { 
    Lock, 
    Shield, 
    Fingerprint, 
    Smartphone,
    Trash2
} from 'lucide-react';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { SudoModal } from '@/components/overlays/SudoModal';
import { useAuth } from '@/lib/auth';
import { KeychainService } from '@/lib/appwrite/keychain';
import { PasskeySetup } from '@/components/overlays/PasskeySetup';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
    const { user } = useAuth();
    const _muiTheme = useTheme();
    const [isUnlocked, setIsUnlocked] = useState(ecosystemSecurity.status.isUnlocked);
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [passkeySetupOpen, setPasskeySetupOpen] = useState(false);
    const [oldPin, setOldPin] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isPinSet, setIsPinSet] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [pendingAction, setPendingAction] = useState<'setup' | 'wipe' | null>(null);

    // Passkey state
    const [passkeyEntries, setPasskeyEntries] = useState<any[]>([]);
    const [_loadingPasskeys, setLoadingPasskeys] = useState(true);

    const loadPasskeys = React.useCallback(async () => {
        if (!user?.$id) return;
        try {
            const entries = await KeychainService.listKeychainEntries(user.$id);
            const pkEntries = entries.filter((e: any) => e.type === 'passkey').map((e: any) => ({
                ...e,
                params: typeof e.params === 'string' ? JSON.parse(e.params) : e.params
            }));
            
            setPasskeyEntries(pkEntries);
        } catch (e) {
            console.error("Failed to load passkeys", e);
        } finally {
            setLoadingPasskeys(false);
        }
    }, [user?.$id]);

    useEffect(() => {
        setIsPinSet(ecosystemSecurity.isPinSet());
        
        const interval = setInterval(() => {
            if (ecosystemSecurity.status.isUnlocked !== isUnlocked) {
                setIsUnlocked(ecosystemSecurity.status.isUnlocked);
            }
        }, 1000);

        if (user?.$id) {
            loadPasskeys();
        }

        return () => clearInterval(interval);
    }, [isUnlocked, user, loadPasskeys]);

    const handleRemovePasskey = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this passkey? This cannot be undone.")) return;
        try {
            await KeychainService.deleteKeychainEntry(id);
            toast.success("Passkey removed");
            loadPasskeys();
        } catch (_e) {
            toast.error("Failed to remove passkey");
        }
    };

    const handleSetPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) {
            setMessage({ type: 'error', text: 'PIN must be 4 digits.' });
            return;
        }
        if (pin !== confirmPin) {
            setMessage({ type: 'error', text: 'New PINs do not match.' });
            return;
        }

        if (isPinSet) {
            const verified = await ecosystemSecurity.verifyPin(oldPin);
            if (!verified) {
                setMessage({ type: 'error', text: 'Current PIN is incorrect.' });
                return;
            }
        }

        if (!isUnlocked) {
            setPendingAction('setup');
            setUnlockModalOpen(true);
            return;
        }

        await executePinSetup();
    };

    const executePinSetup = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const success = await ecosystemSecurity.setupPin(pin);
            if (success) {
                setMessage({ type: 'success', text: isPinSet ? 'PIN updated successfully!' : 'PIN setup successfully!' });
                setIsPinSet(true);
                setPin('');
                setConfirmPin('');
                setOldPin('');
            } else {
                setMessage({ type: 'error', text: 'Failed to setup PIN. Please ensure vault is unlocked.' });
            }
        } catch (_err: unknown) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
            setPendingAction(null);
        }
    };

    const handleWipePin = () => {
        if (!isUnlocked) {
            setPendingAction('wipe');
            setUnlockModalOpen(true);
            return;
        }
        
        ecosystemSecurity.wipePin();
        setIsPinSet(false);
        setOldPin('');
        setPin('');
        setConfirmPin('');
        setMessage({ type: 'success', text: 'PIN has been reset. You can now set a new one.' });
        setPendingAction(null);
    };

    return (
        <AppShell>
            <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, fontFamily: 'var(--font-space-grotesk)' }}>
                    Settings
                </Typography>

                <Stack spacing={4}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Shield size={20} color="var(--color-primary)" /> Security & Privacy
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

                                {/* Passkey Section */}
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Passkeys</Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.6 }}>
                                                Use biometrics to unlock your secure session.
                                            </Typography>
                                        </Box>
                                        <Button 
                                            variant="contained" 
                                            size="small" 
                                            startIcon={<Fingerprint size={16} />}
                                            onClick={() => setPasskeySetupOpen(true)}
                                            sx={{ borderRadius: '10px' }}
                                        >
                                            Add Passkey
                                        </Button>
                                    </Box>

                                    <List sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', p: 0, overflow: 'hidden' }}>
                                        {passkeyEntries.length === 0 ? (
                                            <Box sx={{ p: 2, textAlign: 'center', opacity: 0.5 }}>
                                                <Typography variant="body2">No passkeys registered.</Typography>
                                            </Box>
                                        ) : (
                                            passkeyEntries.map((pk, idx) => (
                                                <React.Fragment key={pk.$id}>
                                                    <ListItem 
                                                        secondaryAction={
                                                            <IconButton edge="end" color="error" onClick={() => handleRemovePasskey(pk.$id)}>
                                                                <Trash2 size={18} />
                                                            </IconButton>
                                                        }
                                                    >
                                                        <ListItemIcon>
                                                            <Fingerprint size={20} color="var(--color-primary)" />
                                                        </ListItemIcon>
                                                        <ListItemText 
                                                            primary={pk.params?.name || `Passkey ${idx + 1}`}
                                                            secondary="Active"
                                                            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                                                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                                        />
                                                    </ListItem>
                                                    {idx < passkeyEntries.length - 1 && <Divider sx={{ opacity: 0.05 }} />}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </List>
                                </Box>

                                <Divider sx={{ opacity: 0.05 }} />

                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Quick Unlock (PIN)</Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
                                        {isPinSet 
                                            ? "Your PIN is active. Use the form below to update it."
                                            : "Set a 4-digit PIN for faster access without entering your master password every time."
                                        }
                                    </Typography>

                                    {message && (
                                        <Alert severity={message.type} sx={{ mb: 3, borderRadius: '12px' }}>
                                            {message.text}
                                        </Alert>
                                    )}

                                    <Box component="form" onSubmit={handleSetPin} sx={{ maxWidth: 300 }}>
                                        <Stack spacing={2}>
                                            {isPinSet && (
                                                <TextField
                                                    fullWidth
                                                    type="password"
                                                    label="Current PIN"
                                                    value={oldPin}
                                                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    variant="filled"
                                                    inputProps={{ maxLength: 4, inputMode: 'numeric' }}
                                                    InputProps={{ disableUnderline: true, sx: { borderRadius: '12px' } }}
                                                />
                                            )}
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label={isPinSet ? "New 4-Digit PIN" : "Set 4-Digit PIN"}
                                                value={pin}
                                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                variant="filled"
                                                inputProps={{ maxLength: 4, inputMode: 'numeric' }}
                                                InputProps={{ disableUnderline: true, sx: { borderRadius: '12px' } }}
                                            />
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="Confirm New PIN"
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
                                                disabled={loading || pin.length !== 4 || pin !== confirmPin || (isPinSet && oldPin.length !== 4)}
                                                sx={{ 
                                                    borderRadius: '12px', 
                                                    py: 1.5, 
                                                    fontWeight: 700,
                                                    bgcolor: isPinSet ? alpha('#6366F1', 0.1) : 'var(--color-primary)',
                                                    color: isPinSet ? 'var(--color-primary)' : 'black',
                                                    border: isPinSet ? '1px solid var(--color-primary)' : 'none',
                                                    '&:hover': { bgcolor: isPinSet ? alpha('#6366F1', 0.2) : alpha('#6366F1', 0.8) }
                                                }}
                                            >
                                                {loading ? <CircularProgress size={24} color="inherit" /> : (isPinSet ? "Update PIN" : "Setup PIN")}
                                            </Button>

                                            {isPinSet && (
                                                <Button 
                                                    fullWidth
                                                    variant="text"
                                                    color="error"
                                                    onClick={handleWipePin}
                                                    startIcon={<Trash2 size={16} />}
                                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    Forgot PIN? Reset with Password
                                                </Button>
                                            )}
                                        </Stack>
                                    </Box>
                                </Box>
                            </Stack>
                        </Paper>
                    </Box>

                    {/* App Settings */}
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Smartphone size={20} color="var(--color-electric)" /> App Preferences
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

            <SudoModal 
                isOpen={unlockModalOpen}
                onCancel={() => {
                    setUnlockModalOpen(false);
                    setPendingAction(null);
                }}
                onSuccess={() => {
                    setIsUnlocked(true);
                    if (pendingAction === 'setup') {
                        executePinSetup();
                    } else if (pendingAction === 'wipe') {
                        ecosystemSecurity.wipePin();
                        setIsPinSet(false);
                        setMessage({ type: 'success', text: 'PIN reset successful.' });
                        setPendingAction(null);
                    }
                }}
            />

            <PasskeySetup 
                isOpen={passkeySetupOpen}
                onClose={() => setPasskeySetupOpen(false)}
                userId={user?.$id || ""}
                onSuccess={() => {
                    setPasskeySetupOpen(false);
                    loadPasskeys();
                }}
                trustUnlocked={true}
            />
        </AppShell>
    );
}
