'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Stack,
    Switch,
    Divider,
    CircularProgress,
    alpha,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Tooltip
} from '@mui/material';
import { User, Search, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { UsersService } from '@/lib/services/users';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

export const DiscoverabilitySettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [username, setUsername] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            const p = await UsersService.getProfileById(user!.$id);
            setProfile(p);
            if (p) {
                setUsername(p.username);
                setNewUsername(p.username);
            }
        } catch (_e: unknown) {
            console.error("Failed to load profile", _e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.$id) {
            loadProfile();
        }
    }, [user, loadProfile]);

    const handleToggleDiscoverability = async (checked: boolean) => {
        if (!user?.$id) return;

        if (!profile) {
            setIsEditing(true);
            toast.error("Set a handle first to enable discovery");
            return;
        }

        setSaving(true);
        try {
            const currentApps = profile.appsActive || [];
            const appsActive = checked
                ? Array.from(new Set([...currentApps, 'connect']))
                : currentApps.filter((a: string) => a !== 'connect');

            await UsersService.updateProfile(user.$id, { appsActive });
            setProfile({ ...profile, appsActive });
            toast.success(checked ? "You are now discoverable" : "Discovery disabled");
        } catch (_e: unknown) {
            toast.error("Failed to update preference");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveUsername = async () => {
        if (!user?.$id || !newUsername) return;
        const normalized = newUsername.toLowerCase().trim().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');

        if (normalized.length < 3) {
            toast.error("Username must be at least 3 characters");
            return;
        }

        setSaving(true);
        try {
            if (profile) {
                await UsersService.updateProfile(user.$id, { username: normalized });
                setUsername(normalized);
                setProfile({ ...profile, username: normalized });
                toast.success("Handle updated");
            } else {
                // Ensure profile for user handles creation with safe defaults
                const p = await UsersService.createProfile(user.$id, normalized, {
                    displayName: user.name || normalized,
                    appsActive: ['connect']
                });
                setProfile(p);
                setUsername(normalized);
                toast.success("Universal identity initialized!");
            }
            setIsEditing(false);
            setShowConfirm(false);
        } catch (e: any) {
            toast.error(e.message || "Failed to save handle");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <CircularProgress size={24} />;

    const isDiscoverable = profile?.appsActive?.includes('connect');

    return (
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Search size={20} color="#00F0FF" /> Discoverability
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
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Public Profile</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.6 }}>Allow others to find you by username</Typography>
                        </Box>
                        <Switch
                            checked={!!isDiscoverable}
                            onChange={(e) => handleToggleDiscoverability(e.target.checked)}
                            disabled={saving}
                            color="primary"
                        />
                    </Box>

                    <Divider sx={{ opacity: 0.05 }} />

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                            Your Universal Handle
                        </Typography>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 2,
                            borderRadius: '16px',
                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <Box sx={{ flex: 1 }}>
                                {isEditing ? (
                                    <TextField
                                        fullWidth
                                        size="small"
                                        variant="standard"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        placeholder="Your handle"
                                        autoFocus
                                        InputProps={{
                                            disableUnderline: true,
                                            startAdornment: <Typography sx={{ color: '#00F0FF', fontWeight: 700, mr: 0.5 }}>@</Typography>,
                                            sx: {
                                                fontFamily: 'var(--font-jetbrains-mono)',
                                                fontWeight: 700,
                                                color: 'white'
                                            }
                                        }}
                                    />
                                ) : (
                                    <>
                                        <Typography sx={{
                                            fontFamily: 'var(--font-jetbrains-mono)',
                                            fontWeight: 700,
                                            opacity: (isDiscoverable || !profile) ? 1 : 0.4,
                                            color: !profile ? '#E2B714' : 'inherit'
                                        }}>
                                            @{username || 'not_set'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.4, display: 'block', mt: 0.5 }}>
                                            {!profile ? 'Identity not set' : 'Universal Identity • Shared handle'}
                                        </Typography>
                                    </>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {isEditing ? (
                                    <>
                                        <Tooltip title="Cancel">
                                            <IconButton size="small" onClick={() => { setIsEditing(false); setNewUsername(username); }} sx={{ color: 'error.main' }}>
                                                <X size={18} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Save">
                                            <IconButton size="small" onClick={() => setShowConfirm(true)} sx={{ color: 'success.main' }} disabled={saving || !newUsername}>
                                                <Check size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </>
                                ) : (
                                    <Tooltip title={profile ? "Change Handle" : "Setup Identity"}>
                                        <IconButton
                                            size="small"
                                            onClick={() => setIsEditing(true)}
                                            sx={{
                                                color: '#00F0FF',
                                                p: 1,
                                                bgcolor: !profile ? alpha('#00F0FF', 0.1) : 'transparent',
                                                '&:hover': { bgcolor: alpha('#00F0FF', 0.15) }
                                            }}
                                        >
                                            <Edit2 size={16} />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                {isDiscoverable && !isEditing && (
                                    <Box sx={{
                                        ml: 'auto',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: '6px',
                                        bgcolor: alpha('#00F0FF', 0.1),
                                        border: '1px solid',
                                        borderColor: alpha('#00F0FF', 0.2),
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: '#00F0FF', textTransform: 'uppercase' }}>
                                            Live
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.4 }}>
                            This handle is shared across the entire Kylrix ecosystem.
                        </Typography>
                </Stack>
            </Paper>

            {/* Confirmation Dialog */}
            <Dialog
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        bgcolor: 'rgba(10, 10, 10, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        width: '100%',
                        maxWidth: '400px'
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700, color: 'white' }}>
                    <ShieldAlert color="#00F0FF" /> Confirm Identity Change
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ opacity: 0.7, mb: 3, color: 'white' }}>
                        Updating your universal handle will change how you are found across all Kylrix apps. This action cannot be easily undone.
                    </Typography>
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px dotted rgba(255, 255, 255, 0.2)' }}>
                        <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mb: 0.5 }}>NEW UNIVERSAL HANDLE</Typography>
                        <Typography sx={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 700, color: '#00F0FF' }}>@{newUsername.toLowerCase().trim()}</Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={() => setShowConfirm(false)} sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>Cancel</Button>
                    <Button
                        onClick={handleSaveUsername}
                        variant="contained"
                        disabled={saving}
                        sx={{
                            borderRadius: '12px',
                            bgcolor: '#00F0FF',
                            color: '#000',
                            fontWeight: 700,
                            '&:hover': { bgcolor: alpha('#00F0FF', 0.8) }
                        }}
                    >
                        {saving ? <CircularProgress size={20} color="inherit" /> : "Update Identity"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
