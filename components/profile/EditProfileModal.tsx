'use client';

import React, { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    TextField, 
    Box, 
    Typography,
    CircularProgress,
    InputAdornment
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { UsersService } from '@/lib/services/users';
import { account } from '@/lib/appwrite/client';

interface EditProfileModalProps {
    open: boolean;
    onClose: () => void;
    profile: any;
    onUpdate: () => void;
}

export const EditProfileModal = ({ open, onClose, profile, onUpdate }: EditProfileModalProps) => {
    const [username, setUsername] = useState(profile?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            setDisplayName(profile.displayName || '');
        }
    }, [profile, open]);

    useEffect(() => {
        const checkUsername = async () => {
            if (!username || username === profile?.username) {
                setIsAvailable(null);
                return;
            }

            if (username.length < 3) {
                setIsAvailable(false);
                return;
            }

            setIsChecking(true);
            try {
                const available = await UsersService.isUsernameAvailable(username);
                setIsAvailable(available);
            } catch (err) {
                console.error('Failed to check username:', err);
            } finally {
                setIsChecking(false);
            }
        };

        const timer = setTimeout(checkUsername, 500);
        return () => clearTimeout(timer);
    }, [username, profile?.username]);

    const handleSave = async () => {
        if (!profile?.$id) return;
        
        if (username !== profile.username && isAvailable === false) {
            setError('Please pick an available username');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await UsersService.updateProfile(profile.$id, {
                username,
                bio,
                displayName
            });

            // Update global account name and username preference for ecosystem coherence
            try {
                if (displayName || username) {
                    if (displayName) await account.updateName(displayName);
                    const currentPrefs = await account.getPrefs();
                    await account.updatePrefs({
                        ...currentPrefs,
                        username: username.toLowerCase().trim()
                    });
                }
            } catch (prefErr) {
                console.warn('Failed to sync display name or username to account prefs', prefErr);
            }

            onUpdate();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Profile</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                    <TextField
                        label="Username"
                        fullWidth
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-0_]/g, ''))}
                        error={isAvailable === false && username !== profile?.username}
                        helperText={
                            isAvailable === false && username !== profile?.username 
                            ? 'Username is already taken' 
                            : 'Only letters, numbers, and underscores allowed'
                        }
                        InputProps={{
                            startAdornment: <InputAdornment position="start">@</InputAdornment>,
                            endAdornment: (
                                <InputAdornment position="end">
                                    {isChecking && <CircularProgress size={20} />}
                                    {!isChecking && isAvailable === true && username !== profile?.username && <CheckCircleIcon color="success" />}
                                    {!isChecking && isAvailable === false && username !== profile?.username && <ErrorIcon color="error" />}
                                </InputAdornment>
                            )
                        }}
                    />

                    <TextField
                        label="Display Name"
                        fullWidth
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />

                    <TextField
                        label="Bio"
                        fullWidth
                        multiline
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell the world about yourself..."
                    />
                </Box>
                {error && (
                    <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button 
                    variant="contained" 
                    onClick={handleSave} 
                    disabled={loading || (isAvailable === false && username !== profile?.username)}
                    sx={{ boxShadow: 'none' }}
                >
                    {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
