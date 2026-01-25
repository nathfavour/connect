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
    Stack,
    CircularProgress,
    alpha,
    useTheme
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { KeychainService } from '@/lib/appwrite/keychain';
import { useAuth } from '@/lib/auth';

interface MasterPassModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const MasterPassModal = ({ open, onClose, onSuccess }: MasterPassModalProps) => {
    const { user } = useAuth();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loading) return;

        setLoading(true);
        setError(null);

        try {
            const entries = await KeychainService.listKeychainEntries(user.$id);
            const passwordEntry = entries.find((e: any) => e.type === 'password');

            if (!passwordEntry) {
                setError('No master password setup found. Please set it up in WhisperrKeep.');
                setLoading(false);
                return;
            }

            const success = await ecosystemSecurity.unlock(password, passwordEntry);
            if (success) {
                setPassword('');
                onSuccess();
                onClose();
            } else {
                setError('Incorrect master password. Please try again.');
            }
        } catch (err) {
            console.error('Unlock failed:', err);
            setError('An error occurred while unlocking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                        <LockIcon />
                    </Box>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-space-grotesk)' }}>
                    Unlock Vault
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    Enter your master password to access secrets
                </Typography>
            </DialogTitle>

            <DialogContent>
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
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
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
            </DialogActions>
        </Dialog>
    );
};
