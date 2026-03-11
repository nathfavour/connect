'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    IconButton,
    Typography,
    Box,
    Stack as _Stack,
    CircularProgress,
    alpha,
    useTheme as _useTheme
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import AppsIcon from '@mui/icons-material/Apps';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { KeychainService } from '@/lib/appwrite/keychain';
import { useAuth } from '@/lib/auth';
import { unlockWithPasskey } from '@/lib/passkey';
import { PasskeySetup } from '@/components/overlays/PasskeySetup';

interface MasterPassModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const MasterPassModal = ({ open, onClose, onSuccess }: MasterPassModalProps) => {
    const { user } = useAuth();
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'password' | 'pin' | 'passkey'>('password');
    const [hasPin, setHasPin] = useState(false);
    const [hasPasskey, setHasPasskey] = useState(false);
    const [showPasskeyIncentive, setShowPasskeyIncentive] = useState(false);

    const handlePasskeyUnlock = React.useCallback(async () => {
        if (!user?.$id || !open) return;
        setLoading(true);
        try {
            const success = await unlockWithPasskey(user.$id);
            if (success && open) {
                try {
                    await ecosystemSecurity.ensureE2EIdentity(user.$id);
                } catch (e) {
                    console.error("Failed to sync identity on passkey unlock", e);
                }
                onSuccess();
                onClose();
            }
        } catch (e) {
            console.error("Passkey unlock failed or cancelled", e);
        } finally {
            setLoading(false);
        }
    }, [user?.$id, open, onSuccess, onClose]);

    React.useEffect(() => {
        if (open && user) {
            const pinSet = ecosystemSecurity.isPinSet();
            setHasPin(pinSet);
            
            // Check for passkeys and auto-trigger if they exist
            KeychainService.listKeychainEntries(user.$id).then(entries => {
                const passkeyPresent = entries.some((e: any) => e.type === 'passkey');
                setHasPasskey(passkeyPresent);
                
                if (passkeyPresent) {
                    setMode('passkey');
                    handlePasskeyUnlock();
                } else if (pinSet) {
                    setMode('pin');
                } else {
                    setMode('password');
                }
            });

            setPassword('');
            setPin('');
            setError(null);
        }
    }, [open, user, handlePasskeyUnlock]);

    const handlePinSubmit = async (pinValue: string) => {
        if (pinValue.length !== 4 || loading) return;

        setLoading(true);
        setError(null);

        try {
            const success = await ecosystemSecurity.unlockWithPin(pinValue);
            if (success) {
                try {
                    await ecosystemSecurity.ensureE2EIdentity(user.$id);
                } catch (e) {
                    console.error("Failed to sync identity on pin unlock", e);
                }
                if (!hasPasskey) {
                    setShowPasskeyIncentive(true);
                } else {
                    onSuccess();
                    onClose();
                }
            } else {
                setError('Incorrect PIN. Please try again.');
                setPin('');
            }
        } catch (err: unknown) {
            console.error('PIN unlock failed:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setPin(val);
        if (val.length === 4) {
            handlePinSubmit(val);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user || loading) return;

        setLoading(true);
        setError(null);

        try {
            const entries = await KeychainService.listKeychainEntries(user.$id);
            const passwordEntry = entries.find((e: any) => e.type === 'password');

            if (!passwordEntry) {
                setError('No master password setup found. Please set it up in Kylrix Vault.');
                setLoading(false);
                return;
            }

            const success = await ecosystemSecurity.unlock(password, passwordEntry);
            if (success) {
                // Ensure Identity is ready for E2E messaging
                await ecosystemSecurity.ensureE2EIdentity(user.$id);
                
                if (!hasPasskey) {
                    setShowPasskeyIncentive(true);
                } else {
                    setPassword('');
                    onSuccess();
                    onClose();
                }
            } else {
                setError('Incorrect master password. Please try again.');
            }
        } catch (err: unknown) {
            console.error('Unlock failed:', err);
            setError('An error occurred while unlocking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (showPasskeyIncentive && user) {
        return (
            <PasskeySetup 
                isOpen={true} 
                onClose={() => {
                    setShowPasskeyIncentive(false);
                    onSuccess();
                    onClose();
                }} 
                userId={user.$id} 
                onSuccess={() => {
                    setShowPasskeyIncentive(false);
                    onSuccess();
                    onClose();
                }}
                trustUnlocked={true}
            />
        );
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    borderRadius: '24px',
                    bgcolor: 'rgba(15, 15, 15, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundImage: 'none',
                    width: '100%',
                    maxWidth: '400px'
                }
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mb: 2 
                }}>
                    <Box sx={{ 
                        p: 1.5, 
                        bgcolor: 'primary.main', 
                        borderRadius: '12px',
                        color: 'black'
                    }}>
                        {mode === 'pin' ? <AppsIcon /> : mode === 'passkey' ? <FingerprintIcon /> : <LockIcon />}
                    </Box>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-space-grotesk)' }}>
                    {mode === 'pin' ? 'Quick Unlock' : mode === 'passkey' ? 'Device Unlock' : 'Unlock Vault'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    {mode === 'pin' ? 'Enter your 4-digit PIN' : mode === 'passkey' ? 'Use your device biometrics' : 'Enter your master password to access secrets'}
                </Typography>
            </DialogTitle>

            <DialogContent>
                {mode === 'pin' ? (
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            type="password"
                            placeholder="••••"
                            value={pin}
                            onChange={handlePinChange}
                            error={Boolean(error)}
                            helperText={error}
                            autoFocus
                            variant="filled"
                            inputProps={{ 
                                maxLength: 4, 
                                inputMode: 'numeric',
                                style: { textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5em' } 
                            }}
                            InputProps={{
                                disableUnderline: true,
                                sx: { 
                                    borderRadius: '12px', 
                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                    '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.08)' }
                                }
                            }}
                        />
                    </Box>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Master Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={Boolean(error)}
                            helperText={error}
                            autoFocus
                            variant="filled"
                            InputProps={{
                                disableUnderline: true,
                                sx: { 
                                    borderRadius: '12px', 
                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                    '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.08)' }
                                },
                                endAdornment: (
                                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                                    </IconButton>
                                )
                            }}
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1, flexDirection: 'column', gap: 2 }}>
                {mode === 'password' && (
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={handleSubmit} 
                        disabled={loading || !password}
                        sx={{ 
                            borderRadius: '12px', 
                            py: 1.2, 
                            fontWeight: 700,
                            bgcolor: 'primary.main',
                            color: 'black',
                            '&:hover': { bgcolor: alpha('#00F0FF', 0.8) }
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Unlock Vault'}
                    </Button>
                )}

                <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'center' }}>
                    {mode !== 'password' && (
                        <Button 
                            size="small" 
                            variant="text" 
                            onClick={() => setMode('password')}
                            sx={{ color: 'text.secondary', textTransform: 'none' }}
                        >
                            Use Password
                        </Button>
                    )}
                    {mode !== 'pin' && hasPin && (
                        <Button 
                            size="small" 
                            variant="text" 
                            onClick={() => setMode('pin')}
                            sx={{ color: 'text.secondary', textTransform: 'none' }}
                        >
                            Use PIN
                        </Button>
                    )}
                    {mode !== 'passkey' && hasPasskey && (
                        <Button 
                            size="small" 
                            variant="text" 
                            onClick={() => setMode('passkey')}
                            sx={{ color: 'text.secondary', textTransform: 'none' }}
                        >
                            Use Passkey
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
};
