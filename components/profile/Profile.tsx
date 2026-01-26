'use client';

import React, { useEffect, useState } from 'react';
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
    Divider,
    Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ChatIcon from '@mui/icons-material/Chat';
import { useRouter } from 'next/navigation';
import { EditProfileModal } from './EditProfileModal';
import { fetchProfilePreview } from '@/lib/profile-preview';
import { getUserProfilePicId } from '@/lib/user-utils';

interface ProfileProps {
    username?: string;
}

export const Profile = ({ username }: ProfileProps) => {
    const { user: authUser } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const normalizeUsername = (value?: string | null) => {
        if (!value) return null;
        return value.toString().trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '') || null;
    };

    const normalizedUsername = normalizeUsername(username);

    // Simplified and more robust own-profile check
    const isOwnProfile = !!(authUser && (
        (profile && profile.$id === authUser.$id) ||
        (!username) || 
        (normalizedUsername && (authUser.prefs?.username === normalizedUsername || authUser.name === username))
    ));

    useEffect(() => {
        console.log('[Profile] authUser:', authUser?.$id, 'profile:', profile?.$id, 'isOwnProfile:', isOwnProfile);
    }, [authUser, profile, isOwnProfile]);

    useEffect(() => {
        loadProfile();
    }, [username, authUser?.$id]); 

    useEffect(() => {
        const fetchAvatar = async () => {
            // Priority 1: If it's our own profile, fetch EXACTLY like the topbar
            if (isOwnProfile && authUser) {
                const picId = getUserProfilePicId(authUser);
                console.log('[Profile] Own profile detected, fetching avatar for ID:', picId);
                if (picId) {
                    try {
                        const url = await fetchProfilePreview(picId, 200, 200);
                        setAvatarUrl(url as unknown as string);
                        return;
                    } catch (e) {
                        console.warn('Profile page failed to fetch own avatar via utility', e);
                    }
                }
            }

            // Priority 2: Fetch from the profile database record
            if (profile) {
                const picId = profile.avatarFileId || profile.profilePicId || profile.avatarUrl || profile.avatar;
                console.log('[Profile] Fetching avatar from database record ID:', picId);
                if (picId && typeof picId === 'string' && picId.length > 5) {
                    try {
                        const url = await fetchProfilePreview(picId, 200, 200);
                        setAvatarUrl(url as unknown as string);
                    } catch (e) {
                        setAvatarUrl(null);
                    }
                } else {
                    setAvatarUrl(null);
                }
            } else {
                setAvatarUrl(null);
            }
        };

        fetchAvatar();
    }, [profile?.$id, profile?.avatarFileId, profile?.profilePicId, authUser?.prefs?.profilePicId, isOwnProfile]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            let data;
            if (username && normalizedUsername !== authUser?.prefs?.username) {
                data = await UsersService.getProfile(username);
                if (!data) {
                    const externalUser = await UsersService.getWhisperrnoteUserByUsername(username);
                    if (externalUser) {
                        data = {
                            $id: externalUser.$id,
                            username: externalUser.username || externalUser.name,
                            displayName: externalUser.name || externalUser.displayName,
                            avatarFileId: externalUser.profilePicId || externalUser.avatar,
                            bio: externalUser.bio,
                            __external: true
                        };
                    }
                }
            } else if (authUser) {
                // Own profile: fetch the record directly without aggressive background sync
                data = await UsersService.getProfileById(authUser.$id);
                
                // Merge with authUser state for real-time consistency
                if (data) {
                    data = {
                        ...data,
                        displayName: data.displayName || authUser.name,
                        username: data.username || authUser.prefs?.username || authUser.name
                    };
                } else {
                    data = {
                        $id: authUser.$id,
                        displayName: authUser.name,
                        username: authUser.prefs?.username || authUser.name,
                        bio: authUser.prefs?.bio || ""
                    };
                }
            }

            setProfile(data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!authUser || !profile) return;
        setFollowLoading(true);
        try {
            await SocialService.followUser(authUser.$id, profile.$id);
            setIsFollowing(true);
        } catch (error) {
            console.error('Follow failed:', error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMessage = () => {
        if (!profile) return;
        router.push(`/chat?userId=${profile.$id}`);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    if (!profile) return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" gutterBottom>Profile not found</Typography>
            <Typography color="text.secondary">The user @{username} doesn't exist in our ecosystem.</Typography>
            <Button sx={{ mt: 2 }} variant="contained" onClick={() => router.push('/')}>Go Home</Button>
        </Box>
    );

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            <Paper sx={{ p: 4, borderRadius: 4, mb: 4 }} elevation={0} variant="outlined">
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4 }}>
                    <Avatar 
                        src={avatarUrl || undefined}
                        sx={{ width: 120, height: 120, fontSize: 48, bgcolor: 'primary.main' }}
                    >
                        {profile.username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            {profile.displayName || profile.username || 'Anonymous'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            @{profile.username}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 2 }}>
                            {profile.bio || 'No bio yet.'}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                            {isOwnProfile ? (
                                <>
                                    <Button 
                                        variant="outlined" 
                                        startIcon={<EditIcon />} 
                                        sx={{ borderRadius: 5 }}
                                        onClick={() => setIsEditModalOpen(true)}
                                    >
                                        Edit Profile
                                    </Button>
                                    <Button variant="outlined" startIcon={<SettingsIcon />} sx={{ borderRadius: 5 }}>
                                        Settings
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button 
                                        variant={isFollowing ? "outlined" : "contained"} 
                                        startIcon={<PersonAddIcon />} 
                                        sx={{ borderRadius: 5 }}
                                        onClick={handleFollow}
                                        disabled={followLoading || !authUser}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Button>
                                    <Button 
                                        variant="outlined" 
                                        startIcon={<ChatIcon />} 
                                        sx={{ borderRadius: 5 }}
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

            <Typography variant="h6" fontWeight="bold" mb={2}>Stats</Typography>
            <Stack direction="row" spacing={2}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3, flex: 1 }} variant="outlined">
                    <Typography variant="h4" fontWeight="bold" color="primary">0</Typography>
                    <Typography variant="body2" color="text.secondary">Posts</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3, flex: 1 }} variant="outlined">
                    <Typography variant="h4" fontWeight="bold" color="primary">0</Typography>
                    <Typography variant="body2" color="text.secondary">Followers</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3, flex: 1 }} variant="outlined">
                    <Typography variant="h4" fontWeight="bold" color="primary">0</Typography>
                    <Typography variant="body2" color="text.secondary">Following</Typography>
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