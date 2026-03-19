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
    Activity,
    Heart,
    MessageCircle,
    Repeat2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/components/providers/ProfileProvider';
import { EditProfileModal } from './EditProfileModal';
import { getUserProfilePicId } from '@/lib/user-utils';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profile-preview';

interface ProfileProps {
    username?: string;
}

export const Profile = ({ username }: ProfileProps) => {
    const { user: currentUser } = useAuth();
    const { profile: myProfile, refreshProfile: refreshMyProfile } = useProfile();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [profileUrl, setProfileUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [moments, setMoments] = useState<any[]>([]);
    const [momentsLoading, setMomentsLoading] = useState(false);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

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
                // Use the profile from context if it's our own profile
                if (myProfile && myProfile.$id === currentUser.$id) {
                    data = myProfile;
                } else {
                    data = await UsersService.getProfileById(currentUser.$id);
                }
            }

            if (data) {
                setProfile(data);
                
                // Load Stats & Moments
                setMomentsLoading(true);
                const [feedRes, followStats, followingStatus] = await Promise.all([
                    SocialService.getFeed(currentUser?.$id, data.$id),
                    SocialService.getFollowStats(data.$id),
                    currentUser ? SocialService.isFollowing(currentUser.$id, data.$id) : Promise.resolve(false)
                ]);

                setMoments(feedRes.rows);
                setStats({
                    posts: feedRes.total,
                    followers: followStats.followers,
                    following: followStats.following
                });
                setIsFollowing(followingStatus);
                setMomentsLoading(false);
            } else {
                setProfile(null);
            }
        } catch (error: unknown) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    }, [username, currentUser, myProfile]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleFollow = async () => {
        if (!currentUser || !profile) return;
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await SocialService.unfollowUser(currentUser.$id, profile.$id);
                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
            } else {
                await SocialService.followUser(currentUser.$id, profile.$id);
                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (error: unknown) {
            console.error('Follow operation failed:', error);
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
                                bgcolor: '#F59E0B',
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
                                            bgcolor: '#F59E0B',
                                            color: 'black',
                                            '&:hover': { bgcolor: alpha('#F59E0B', 0.8) }
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
                                                borderColor: '#6366F1',
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
                                            bgcolor: isFollowing ? 'transparent' : '#F59E0B',
                                            color: isFollowing ? '#F59E0B' : 'black',
                                            borderColor: isFollowing ? '#F59E0B' : 'none',
                                            '&:hover': { 
                                                bgcolor: isFollowing ? alpha('#F59E0B', 0.05) : alpha('#F59E0B', 0.8) 
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
                                                borderColor: '#6366F1',
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
                <Activity size={20} color="#F59E0B" /> Activity Stats
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
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#F59E0B', fontFamily: 'var(--font-clash)' }}>{stats.posts}</Typography>
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
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--color-primary)', fontFamily: 'var(--font-clash)' }}>{stats.followers}</Typography>
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
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#F59E0B', fontFamily: 'var(--font-clash)' }}>{stats.following}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em', mt: 1 }}>Following</Typography>
                </Paper>
            </Stack>

            <Box sx={{ mt: 6 }}>
                <Typography variant="h6" sx={{ 
                    fontWeight: 800, 
                    mb: 3, 
                    fontFamily: 'var(--font-clash)',
                    opacity: 0.8
                }}>
                    Moments
                </Typography>

                {momentsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
                ) : (
                    <Stack spacing={2}>
                        {moments.map((moment) => (
                            <Paper
                                key={moment.$id}
                                onClick={() => router.push(`/post/${moment.$id}`)}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 5,
                                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.04)',
                                        borderColor: 'rgba(245, 158, 11, 0.3)',
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                                    {moment.caption}
                                </Typography>
                                <Stack direction="row" spacing={3} sx={{ color: 'text.disabled' }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Heart size={14} fill={moment.isLiked ? '#F59E0B' : 'none'} color={moment.isLiked ? '#F59E0B' : 'currentColor'} />
                                        <Typography variant="caption" fontWeight={700}>{moment.stats?.likes || 0}</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <MessageCircle size={14} />
                                        <Typography variant="caption" fontWeight={700}>{moment.stats?.replies || 0}</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Repeat2 size={14} />
                                        <Typography variant="caption" fontWeight={700}>{moment.stats?.pulses || 0}</Typography>
                                    </Stack>
                                </Stack>
                            </Paper>
                        ))}
                        {moments.length === 0 && (
                            <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.4, fontWeight: 600 }}>No moments shared yet.</Typography>
                        )}
                    </Stack>
                )}
            </Box>

            <EditProfileModal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onUpdate={() => {
                    refreshMyProfile();
                    loadProfile();
                }}
            />
        </Box>
    );
};
