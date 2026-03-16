'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UsersService } from '@/lib/services/users';
import { SocialService } from '@/lib/services/social';
import { useAuth } from '@/lib/auth';
import {
    Box,
    Typography,
    Avatar,
    Paper,
    Button,
    CircularProgress,
    Stack,
    alpha
} from '@mui/material';
import { 
    Edit3 as EditIcon, 
    Settings as SettingsIcon, 
    UserPlus as PersonAddIcon, 
    MessageSquare as ChatIcon,
    Layers,
    Users,
    Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EditProfileModal } from './EditProfileModal';
import { getUserProfilePicId } from '@/lib/user-utils';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profile-preview';

interface ProfileProps {
    username?: string;
}

export const Profile = ({ username }: ProfileProps) => {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [profileUrl, setProfileUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (!currentUser) return;

        const profilePicId = getUserProfilePicId(currentUser);
        const cached = getCachedProfilePreview(profilePicId || undefined);
        if (cached !== undefined && mounted) {
            setProfileUrl(cached ?? null);
        }

        const fetchPreview = async () => {
            try {
                if (profilePicId) {
                    const url = await fetchProfilePreview(profilePicId, 140, 140);
                    if (mounted) setProfileUrl(url as unknown as string);
                } else if (mounted) setProfileUrl(null);
            } catch (_err: unknown) {
                if (mounted) setProfileUrl(null);
            }
        };

        fetchPreview();
        return () => { mounted = false; };
    }, [currentUser]);

    const normalizeUsername = (value?: string | null) => {
        if (!value) return null;
        return value.toString().trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '') || null;
    };

    const normalizedUsername = normalizeUsername(username);

    const isOwnProfile = currentUser && !profile?.__external && (
        normalizedUsername === profile?.username ||
        (!normalizedUsername && profile?.$id === currentUser.$id)
    );

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            let data;
            if (username) {
                data = await UsersService.getProfile(username);
            } else if (currentUser) {
                data = await UsersService.getProfileById(currentUser.$id);
            }

            if (data) {
                setProfile(data);
            } else if (currentUser && !username) {
                // Fallback for current user if profile not found in chat directory
                // We use the same preview logic as AppHeader
                const profilePicId = getUserProfilePicId(currentUser);
                let avatarUrl = null;
                
                if (profilePicId) {
                    const cached = getCachedProfilePreview(profilePicId);
                    if (cached) {
                        avatarUrl = cached;
                    } else {
                        try {
                            avatarUrl = await fetchProfilePreview(profilePicId, 140, 140);
                        } catch (e) {
                            console.warn("Could not fetch fallback avatar", e);
                        }
                    }
                }

                setProfile({
                    $id: currentUser.$id,
                    username: currentUser.name || 'user',
                    displayName: currentUser.name,
                    avatar: avatarUrl,
                    bio: 'Kylrix Ecosystem Resident',
                    __isFallback: true
                });
            } else {
                setProfile(null);
            }
        } catch (error: unknown) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    }, [username, currentUser]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleFollow = async () => {
        if (!currentUser) return; // Prompt to login
        setFollowLoading(true);
        try {
            await SocialService.followUser(currentUser.$id, profile.$id);
            setIsFollowing(true);
        } catch (error: unknown) {
            console.error('Follow failed:', error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMessage = () => {
        if (!profile) return;
        router.push(`/chats?userId=${profile.$id}`);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    if (!profile) return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" gutterBottom>Profile not found</Typography>
            <Typography color="text.secondary">The user @{username} doesn&apos;t exist in our ecosystem.</Typography>
            <Button sx={{ mt: 2 }} variant="contained" onClick={() => router.push('/')}>Go Home</Button>
        </Box>
    );

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2, pt: 4 }}>
                <Paper sx={{ 
                    p: 4, 
                    borderRadius: '32px', 
                    mb: 4,
                    background: '#161412',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '32px'
                    }
                }} elevation={0}>
                {/* Brand Accent Blur */}
                <Box sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 200,
                    height: 200,
                    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0) 70%)',
                    filter: 'blur(40px)',
                    zIndex: 0
                }} />

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
                        <Avatar
                            src={profileUrl || profile.avatar}
                            sx={{ 
                                width: 140, 
                                height: 140, 
                                fontSize: 48, 
                                bgcolor: '#EC4899',
                                color: 'black',
                                fontWeight: 900,
                                border: '4px solid rgba(255, 255, 255, 0.05)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                fontFamily: 'var(--font-clash)'
                            }}
                        >
                        {(profile.displayName || profile.username || currentUser?.name || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                        <Typography variant="h3" sx={{ 
                            fontWeight: 900, 
                            mb: 0.5,
                            fontFamily: 'var(--font-clash)',
                            letterSpacing: '-0.04em'
                        }}>
                            {profile.displayName || profile.username || 'Anonymous'}
                        </Typography>
                        <Typography variant="body1" sx={{ 
                            opacity: 0.5, 
                            mb: 2,
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.9rem'
                        }}>
                            @{profile.username}
                        </Typography>
                        <Typography variant="body1" sx={{ 
                            mt: 2, 
                            lineHeight: 1.6,
                            color: 'var(--color-gunmetal)',
                            maxWidth: '500px',
                            opacity: profile?.__isFallback ? 0.4 : 1
                        }}>
                            {profile.bio || (profile?.__isFallback ? 'This identity is private within Connect.' : 'No bio yet. This user prefers to stay mysterious.')}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1.5, mt: 4, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap' }}>
                            {isOwnProfile ? (
                                <>
                                    <Button
                                        variant="contained"
                                        startIcon={<EditIcon size={18} />}
                                        sx={{ 
                                            borderRadius: '14px',
                                            px: 3,
                                            py: 1,
                                            fontWeight: 700,
                                            bgcolor: '#EC4899',
                                            color: 'black',
                                            '&:hover': { bgcolor: alpha('#EC4899', 0.8) }
                                        }}
                                        onClick={() => setIsEditModalOpen(true)}
                                    >
                                        Edit Profile
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<SettingsIcon size={18} />}
                                        sx={{ 
                                            borderRadius: '14px',
                                            px: 3,
                                            py: 1,
                                            fontWeight: 700,
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'var(--color-titanium)',
                                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                                            '&:hover': { 
                                                borderColor: 'var(--color-primary)',
                                                bgcolor: alpha('#6366F1', 0.05)
                                            }
                                        }}
                                        onClick={() => {
                                            const domain = process.env.NEXT_PUBLIC_DOMAIN || 'kylrix.space';
                                            const idSubdomain = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN || 'accounts';
                                            window.location.href = `https://${idSubdomain}.${domain}/settings?source=${encodeURIComponent(window.location.origin)}`;
                                        }}
                                    >
                                        Settings
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant={isFollowing ? "outlined" : "contained"}
                                        startIcon={<PersonAddIcon size={18} />}
                                        sx={{ 
                                            borderRadius: '14px',
                                            px: 3,
                                            py: 1,
                                            fontWeight: 700,
                                            bgcolor: isFollowing ? 'transparent' : '#EC4899',
                                            color: isFollowing ? '#EC4899' : 'black',
                                            borderColor: isFollowing ? '#EC4899' : 'none',
                                            '&:hover': { 
                                                bgcolor: isFollowing ? alpha('#EC4899', 0.05) : alpha('#EC4899', 0.8) 
                                            }
                                        }}
                                        onClick={handleFollow}
                                        disabled={followLoading || !currentUser}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ChatIcon size={18} />}
                                        sx={{ 
                                            borderRadius: '14px',
                                            px: 3,
                                            py: 1,
                                            fontWeight: 700,
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'var(--color-titanium)',
                                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                                            '&:hover': { 
                                                borderColor: 'var(--color-primary)',
                                                bgcolor: alpha('#6366F1', 0.05)
                                            }
                                        }}
                                        onClick={handleMessage}
                                    >
                                        Message
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <Typography variant="h6" sx={{ 
                fontWeight: 800, 
                mb: 3, 
                fontFamily: 'var(--font-clash)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                opacity: 0.8
            }}>
                <Activity size={20} color="#EC4899" /> Activity Stats
            </Typography>
            <Stack direction="row" spacing={2}>
                <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: '24px', 
                    flex: 1,
                    background: '#161412',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '24px'
                    }
                }} elevation={0}>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#EC4899', fontFamily: 'var(--font-clash)' }}>0</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em', mt: 1 }}>Posts</Typography>
                </Paper>
                <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: '24px', 
                    flex: 1,
                    background: '#161412',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '24px'
                    }
                }} elevation={0}>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--color-primary)', fontFamily: 'var(--font-clash)' }}>0</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em', mt: 1 }}>Followers</Typography>
                </Paper>
                <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: '24px', 
                    flex: 1,
                    background: '#161412',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '24px'
                    }
                }} elevation={0}>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--color-titanium)', fontFamily: 'var(--font-clash)' }}>0</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em', mt: 1 }}>Following</Typography>
                </Paper>
            </Stack>

            <EditProfileModal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onUpdate={loadProfile}
            />
        </Box>
    );
};
