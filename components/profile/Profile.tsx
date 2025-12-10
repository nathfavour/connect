'use client';

import React, { useEffect, useState } from 'react';
import { UsersService } from '@/lib/services/users';
import { useAuth } from '@/lib/auth';
import { 
    Box, 
    Typography, 
    Avatar, 
    Paper, 
    Button, 
    CircularProgress,
    Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';

export const Profile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            const data = await UsersService.getProfileById(user!.$id);
            setProfile(data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    if (!profile) return <Typography>Profile not found</Typography>;

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
            <Paper sx={{ p: 4, borderRadius: 4, mb: 4 }} elevation={0} variant="outlined">
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4 }}>
                    <Avatar 
                        sx={{ width: 120, height: 120, fontSize: 48, bgcolor: 'primary.main' }}
                    >
                        {profile.username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            {profile.displayName || profile.username}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            @{profile.username}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 2 }}>
                            {profile.bio || 'No bio yet.'}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                            <Button variant="outlined" startIcon={<EditIcon />} sx={{ borderRadius: 5 }}>
                                Edit Profile
                            </Button>
                            <Button variant="outlined" startIcon={<SettingsIcon />} sx={{ borderRadius: 5 }}>
                                Settings
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <Typography variant="h6" fontWeight="bold" mb={2}>Stats</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }} variant="outlined">
                        <Typography variant="h4" fontWeight="bold" color="primary">0</Typography>
                        <Typography variant="body2" color="text.secondary">Posts</Typography>
                    </Paper>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }} variant="outlined">
                        <Typography variant="h4" fontWeight="bold" color="primary">0</Typography>
                        <Typography variant="body2" color="text.secondary">Followers</Typography>
                    </Paper>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }} variant="outlined">
                        <Typography variant="h4" fontWeight="bold" color="primary">0</Typography>
                        <Typography variant="body2" color="text.secondary">Following</Typography>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};
