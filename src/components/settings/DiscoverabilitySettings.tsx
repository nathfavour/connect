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
    Avatar
} from '@mui/material';
import { Search, Edit2, Check, X, ShieldAlert, User, Image as ImageIcon, Globe, MessageSquare } from 'lucide-react';
import { UsersService } from '@/lib/services/users';
import { useAuth } from '@/lib/auth';
import { getUserProfilePicId } from '@/lib/user-utils';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import toast from 'react-hot-toast';
import { SudoModal } from '../overlays/SudoModal';

export const DiscoverabilitySettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [savingDiscoverable, setSavingDiscoverable] = useState(false);
    const [savingContact, setSavingContact] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [username, setUsername] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [isSudoOpen, setIsSudoOpen] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            const p = await UsersService.getProfileById(user!.$id);
            setProfile(p);
            if (p) {
                setUsername(p.username || '');
                setNewUsername(p.username || '');
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

    useEffect(() => {
        const check = async () => {
            const normalized = newUsername.toLowerCase().trim().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
            if (!normalized || normalized === username || normalized.length < 3) {
                setIsAvailable(null);
                return;
            }

            setCheckingAvailability(true);
            try {
                const available = await UsersService.isUsernameAvailable(normalized);
                setIsAvailable(available);
            } catch (e) {
                console.error("Check failed", e);
                setIsAvailable(null);
            } finally {
                setCheckingAvailability(false);
            }
        };

        const timeoutId = setTimeout(check, 500);
        return () => clearTimeout(timeoutId);
    }, [newUsername, username]);

    const handleToggleDiscoverability = async (checked: boolean) => {
        if (!user?.$id) return;

        setSavingDiscoverable(true);
        try {
            const p = await UsersService.setProfileDiscoverable(user.$id, checked);
            setProfile(p || profile);
            toast.success(checked ? "Profile is now discoverable to everyone" : "Profile is now private");
        } catch (e: any) {
            toast.error(e.message || "Failed to toggle profile discoverability");
        } finally {
            setSavingDiscoverable(false);
        }
    };

    const handleToggleAvatarVisibility = async (checked: boolean) => {
        if (!user?.$id) return;

        const fileId = getUserProfilePicId(user);
        if (!fileId) {
            toast.error("Set a profile picture first to enable visibility");
            return;
        }

        setSavingAvatar(true);
        try {
            const p = await UsersService.setAvatarVisible(user.$id, fileId, checked);
            setProfile(p || profile);
            toast.success(checked ? "Profile image is now public" : "Profile image visibility disabled");
        } catch (e: any) {
            toast.error(e.message || "Failed to toggle avatar visibility");
        } finally {
            setSavingAvatar(false);
        }
    };

    const handleToggleContact = async (checked: boolean) => {
        if (!user?.$id) return;

        if (checked) {
            // Turning ON requires vault unlock
            if (!ecosystemSecurity.status.isUnlocked) {
                setIsSudoOpen(true);
                return;
            }
            
            setSavingContact(true);
            try {
                const pub = await ecosystemSecurity.ensureE2EIdentity(user.$id);
                if (pub) {
                    const p = await UsersService.updateProfile(user.$id, { publicKey: pub });
                    setProfile(p || { ...profile, publicKey: pub });
                    toast.success("People can now contact you securely");
                }
            } catch (e: any) {
                toast.error("Failed to enable contact: " + e.message);
            } finally {
                setSavingContact(false);
            }
        } else {
            // Turning OFF just deletes the publicKey
            setSavingContact(true);
            try {
                const p = await UsersService.updateProfile(user.$id, { publicKey: "" });
                setProfile(p || { ...profile, publicKey: "" });
                toast.success("Secure contact disabled");
            } catch (e: any) {
                toast.error("Failed to disable contact: " + e.message);
            } finally {
                setSavingContact(false);
            }
        }
    };

    const handleSyncE2E = async () => {
        if (!user?.$id || !profile) return;

        if (!ecosystemSecurity.status.isUnlocked) {
            toast.error("Unlock your vault to enable secure discoverability");
            return;
        }

        setSaving(true);
        setSyncError(null);
        try {
            const pub = await ecosystemSecurity.ensureE2EIdentity(user.$id);
            if (pub) {
                setProfile({ ...profile, publicKey: pub });
                toast.success("E2E Identity initialized");
            } else {
                setSyncError("Identity exists locally but could not be published.");
            }
        } catch (e: any) {
            console.error("Sync error:", e);
            setSyncError(e.message || "Failed to sync identity keys");
            toast.error("Failed to initialize identity");
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
            let publicKey: string | undefined;
            try {
                // Silently try to get or establish the security public key
                if (ecosystemSecurity.status.isUnlocked) {
                    const pub = await ecosystemSecurity.ensureE2EIdentity(user.$id);
                    if (pub) publicKey = pub;
                }
            } catch (e) {
                console.warn("Could not sync public key during handle change", e);
            }

            if (profile) {
                const updated = await UsersService.updateProfile(user.$id, { username: normalized, publicKey });
                setUsername(normalized);
                setProfile(updated || { ...profile, username: normalized, publicKey });
                toast.success("Handle updated");
            } else {
                // Ensure profile for user handles creation with safe defaults
                const p = await UsersService.createProfile(user.$id, normalized, {
                    displayName: user.name || (normalized.charAt(0).toUpperCase() + normalized.slice(1)),
                    publicKey
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

    const isDiscoverable = profile?.$permissions?.some((p: string) => p.includes('read("any")'));
    const isAvatarVisible = !!profile?.avatar;
    const isContactable = !!profile?.publicKey;

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
                    {/* Discoverability Section */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ p: 1, borderRadius: '12px', bgcolor: alpha('#00F0FF', 0.1), color: '#00F0FF' }}>
                                <Globe size={18} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Global Discoverability</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.5, fontSize: '0.8rem' }}>Allow anyone in Kylrix to find your profile</Typography>
                            </Box>
                        </Box>
                        <Switch
                            checked={!!isDiscoverable}
                            onChange={(e) => handleToggleDiscoverability(e.target.checked)}
                            disabled={savingDiscoverable}
                            color="primary"
                        />
                    </Box>

                    <Divider sx={{ opacity: 0.05 }} />

                    {/* Avatar Visibility Section */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ p: 1, borderRadius: '12px', bgcolor: alpha('#F43F5E', 0.1), color: '#F43F5E' }}>
                                <ImageIcon size={18} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Profile Image Visibility</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.5, fontSize: '0.8rem' }}>Show your universal avatar to others</Typography>
                            </Box>
                        </Box>
                        <Switch
                            checked={!!isAvatarVisible}
                            onChange={(e) => handleToggleAvatarVisibility(e.target.checked)}
                            disabled={savingAvatar}
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#F43F5E' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#F43F5E' }
                            }}
                        />
                    </Box>

                    <Divider sx={{ opacity: 0.05 }} />

                    {/* Allow Contact Section */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ p: 1, borderRadius: '12px', bgcolor: alpha('#6366F1', 0.1), color: '#6366F1' }}>
                                <MessageSquare size={18} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Allow Contact</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.5, fontSize: '0.8rem' }}>Allow others to send you encrypted messages</Typography>
                            </Box>
                        </Box>
                        <Switch
                            checked={isContactable}
                            onChange={(e) => handleToggleContact(e.target.checked)}
                            disabled={savingContact || (!isContactable && !ecosystemSecurity.status.isUnlocked)}
                            sx={{
                                opacity: (!isContactable && !ecosystemSecurity.status.isUnlocked) ? 0.5 : 1,
                                filter: (!isContactable && !ecosystemSecurity.status.isUnlocked) ? 'blur(0.5px)' : 'none',
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366F1' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6366F1' }
                            }}
                        />
                    </Box>

                    <Divider sx={{ opacity: 0.05 }} />

                    {/* Communication Sync Notification */}
                    {profile && !profile.publicKey && (
                        <Box sx={{
                            mt: 1,
                            mb: 1,
                            p: 2,
                            borderRadius: '20px',
                            bgcolor: alpha('#E2B714', 0.05),
                            border: '1px solid',
                            borderColor: alpha('#E2B714', 0.15),
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5
                        }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{
                                    p: 1,
                                    borderRadius: '12px',
                                    bgcolor: alpha('#E2B714', 0.1),
                                    color: '#E2B714',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ShieldAlert size={20} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#E2B714', letterSpacing: '-0.01em' }}>
                                        Communication Sync Incomplete
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.4 }}>
                                        Your handle is reserved, but your E2E encryption keys aren&apos;t published.
                                        Others cannot send you encrypted messages yet.
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={handleSyncE2E}
                                    disabled={saving}
                                    sx={{
                                        bgcolor: '#E2B714',
                                        color: '#000',
                                        '&:hover': { bgcolor: alpha('#E2B714', 0.8) },
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        borderRadius: '10px',
                                        px: 2,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {saving ? <CircularProgress size={16} color="inherit" /> : "Sync Keys"}
                                </Button>
                            </Stack>
                            {syncError && (
                                <Box sx={{
                                    p: 1.5,
                                    borderRadius: '12px',
                                    bgcolor: alpha('#FF5252', 0.05),
                                    border: '1px solid',
                                    borderColor: alpha('#FF5252', 0.2)
                                }}>
                                    <Typography variant="caption" sx={{ color: '#FF5252', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                                        <X size={12} /> Sync Error: {syncError}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Universal Handle Section */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <User size={14} color="rgba(255, 255, 255, 0.4)" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                Universal Identity Handle
                            </Typography>
                        </Box>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: '2px 2px 2px 16px',
                            borderRadius: '20px',
                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            transition: 'all 0.2s ease-in-out',
                            '&:focus-within': {
                                borderColor: alpha('#00F0FF', 0.3),
                                bgcolor: alpha('#00F0FF', 0.02),
                            }
                        }}>
                            <Box sx={{ flex: 1, py: 1.5 }}>
                                {isEditing ? (
                                    <Box>
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
                                                startAdornment: <Typography sx={{ color: '#00F0FF', fontWeight: 900, mr: 0.5, fontSize: '1.1rem' }}>@</Typography>,
                                                endAdornment: (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
                                                        {checkingAvailability && <CircularProgress size={14} sx={{ color: '#00F0FF' }} />}
                                                        {!checkingAvailability && isAvailable === true && <Check size={16} color="#00F0FF" strokeWidth={3} />}
                                                        {!checkingAvailability && isAvailable === false && <X size={16} color="#FF5252" strokeWidth={3} />}
                                                    </Box>
                                                ),
                                                sx: {
                                                    fontFamily: 'var(--font-jetbrains-mono)',
                                                    fontWeight: 800,
                                                    fontSize: '1rem',
                                                    color: 'white',
                                                    letterSpacing: '-0.02em'
                                                }
                                            }}
                                        />
                                        {isAvailable === false && (
                                            <Typography variant="caption" sx={{ color: '#FF5252', fontWeight: 700, mt: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                                Handle unavailable
                                            </Typography>
                                        )}
                                    </Box>
                                ) : (
                                    <>
                                        <Typography sx={{
                                            fontFamily: 'var(--font-jetbrains-mono)',
                                            fontWeight: 800,
                                            fontSize: '1.1rem',
                                            letterSpacing: '-0.03em',
                                            opacity: (isDiscoverable || !profile) ? 1 : 0.4,
                                            color: !profile ? '#E2B714' : 'inherit'
                                        }}>
                                            @{username || 'not_set'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.3, display: 'block', mt: 0.2, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                                            {!profile ? 'Identity Required' : 'Verified Ecosystem Handle'}
                                        </Typography>
                                    </>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', gap: 0.5, pr: 0.5 }}>
                                {isEditing ? (
                                    <>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => { setIsEditing(false); setNewUsername(username); setIsAvailable(null); }}
                                            sx={{ 
                                                color: 'rgba(255, 255, 255, 0.3)',
                                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '14px',
                                                p: 1.5,
                                                '&:hover': { bgcolor: alpha('#FF5252', 0.1), color: '#FF5252' }
                                            }}
                                        >
                                            <X size={18} strokeWidth={2.5} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowConfirm(true)}
                                            disabled={saving || !newUsername || isAvailable === false || checkingAvailability || (newUsername === username && !!profile)}
                                            sx={{ 
                                                color: '#000',
                                                bgcolor: '#00F0FF',
                                                borderRadius: '14px',
                                                p: 1.5,
                                                '&:hover': { bgcolor: alpha('#00F0FF', 0.8) },
                                                '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.1)' }
                                            }}
                                        >
                                            <Check size={18} strokeWidth={3} />
                                        </IconButton>
                                    </>
                                ) : (
                                    <Button
                                        size="small"
                                        onClick={() => setIsEditing(true)}
                                        startIcon={<Edit2 size={14} strokeWidth={2.5} />}
                                        sx={{
                                            color: !profile ? '#000' : '#00F0FF',
                                            bgcolor: !profile ? '#E2B714' : alpha('#00F0FF', 0.05),
                                            borderRadius: '16px',
                                            px: 2,
                                            py: 1,
                                            fontWeight: 800,
                                            textTransform: 'none',
                                            fontSize: '0.8rem',
                                            border: '1px solid',
                                            borderColor: !profile ? '#E2B714' : alpha('#00F0FF', 0.1),
                                            '&:hover': { 
                                                bgcolor: !profile ? alpha('#E2B714', 0.8) : alpha('#00F0FF', 0.1),
                                                borderColor: !profile ? '#E2B714' : alpha('#00F0FF', 0.2)
                                            }
                                        }}
                                    >
                                        {profile ? "Modify" : "Setup Identity"}
                                    </Button>
                                )}
                            </Box>
                        </Box>
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.4 }}>
                            This handle is shared across the entire Kylrix ecosystem.
                        </Typography>
                    </Box>
                </Stack>
            </Paper>

            <SudoModal
                isOpen={isSudoOpen}
                onCancel={() => setIsSudoOpen(false)}
                onSuccess={() => {
                    setIsSudoOpen(false);
                    handleToggleContact(true);
                }}
            />

            <Box sx={{ mt: 3, p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={profile?.avatar} alt="Profile Preview" sx={{ width: 48, height: 48, border: '2px solid rgba(255, 255, 255, 0.1)' }} />
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Profile Preview</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>How you appear in search results</Typography>
                </Box>
            </Box>

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
