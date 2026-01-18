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

interface ProfileProps {
    username?: string;
}

export const Profile = ({ username }: ProfileProps) => {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const normalizeUsername = (value?: string | null) => {
        if (!value) return null;
        return value.toString().trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '') || null;
    };

    const normalizedUsername = normalizeUsername(username);

    const isOwnProfile = currentUser && !profile?.__external && (
        normalizedUsername === profile?.username || 
        (!normalizedUsername && profile?.$id === currentUser.$id)
    );

    useEffect(() => {
        loadProfile();
    }, [username, currentUser]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            let data;
            if (username) {
                data = await UsersService.getProfile(username);
                if (!data) {
                    const externalUser = await UsersService.getWhisperrnoteUserByUsername(username);
                    if (externalUser) {
                        const fallbackUsername = normalizeUsername(externalUser.username || externalUser.name || externalUser.email);
                        data = {
                            $id: externalUser.$id,
                            username: fallbackUsername || username,
                            displayName: externalUser.name || externalUser.displayName || fallbackUsername || 'User',
                            avatarUrl: externalUser.avatarUrl || null,
                            bio: externalUser.bio || null,
                            __external: true
                        };
                    }
                }
            } else if (currentUser) {
                data = await UsersService.getProfileById(currentUser.$id);
            }

            if (data) {
                setProfile(data);
                // Check if following if it's someone else's profile
                if (currentUser && data.$id !== currentUser.$id) {
                    // Logic to check follow status could go here
                }
            } else {
                setProfile(null);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUser) return; // Prompt to login
        setFollowLoading(true);
        try {
            await SocialService.followUser(currentUser.$id, profile.$id);
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
                        src={profile.avatarUrl}
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
                                        disabled={followLoading || !currentUser}
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
