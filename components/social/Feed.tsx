'use client';

import React, { useEffect, useState } from 'react';
import { SocialService } from '@/lib/services/social';
import { UsersService } from '@/lib/services/users';
import { useAuth } from '@/lib/auth';
import { 
    Box, 
    Card, 
    CardHeader, 
    CardContent, 
    CardActions, 
    Avatar, 
    Typography, 
    IconButton, 
    TextField, 
    Button,
    CircularProgress,
    Divider
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShareIcon from '@mui/icons-material/Share';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';

export const Feed = () => {
    const { user } = useAuth();
    const [moments, setMoments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMoment, setNewMoment] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        if (user) {
            loadFeed();
        }
    }, [user]);

    const loadFeed = async () => {
        try {
            const response = await SocialService.getFeed(user!.$id);
            // Enrich with creator details
            const enriched = await Promise.all(response.rows.map(async (moment: any) => {
                try {
                    const creator = await UsersService.getProfileById(moment.creatorId);
                    return { ...moment, creator };
                } catch (e) {
                    return { ...moment, creator: { username: 'Unknown', $id: moment.creatorId } };
                }
            }));
            setMoments(enriched);
        } catch (error) {
            console.error('Failed to load feed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async () => {
        if (!newMoment.trim() || !user) return;
        setPosting(true);
        try {
            await SocialService.createMoment(user.$id, newMoment);
            setNewMoment('');
            loadFeed(); // Reload feed
        } catch (error) {
            console.error('Failed to post:', error);
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (momentId: string) => {
        if (!user) return;
        try {
            await SocialService.likeMoment(user.$id, momentId);
            // Optimistic update or reload
            // For MVP, just alert or console log
            console.log('Liked moment:', momentId);
        } catch (error) {
            console.error('Failed to like:', error);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
            {/* Create Post */}
            <Card sx={{ mb: 3, borderRadius: 3 }} elevation={0} variant="outlined">
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>{user?.username?.charAt(0).toUpperCase()}</Avatar>
                        <TextField
                            fullWidth
                            placeholder="What's on your mind?"
                            multiline
                            rows={2}
                            variant="standard"
                            InputProps={{ disableUnderline: true }}
                            value={newMoment}
                            onChange={(e) => setNewMoment(e.target.value)}
                        />
                    </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                    <Button 
                        variant="contained" 
                        endIcon={<SendIcon />} 
                        onClick={handlePost}
                        disabled={!newMoment.trim() || posting}
                        sx={{ borderRadius: 5 }}
                    >
                        Post
                    </Button>
                </CardActions>
            </Card>

            {/* Feed */}
            {moments.map((moment) => (
                <Card key={moment.$id} sx={{ mb: 2, borderRadius: 3 }} elevation={0} variant="outlined">
                    <CardHeader
                        avatar={
                            <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                {moment.creator?.username?.charAt(0).toUpperCase() || '?'}
                            </Avatar>
                        }
                        title={moment.creator?.displayName || moment.creator?.username}
                        subheader={new Date(moment.createdAt).toLocaleString()}
                    />
                    <CardContent>
                        <Typography variant="body1">{moment.content}</Typography>
                    </CardContent>
                    <CardActions disableSpacing>
                        <IconButton onClick={() => handleLike(moment.$id)}>
                            <FavoriteBorderIcon />
                        </IconButton>
                        <IconButton>
                            <CommentIcon />
                        </IconButton>
                        <IconButton>
                            <ShareIcon />
                        </IconButton>
                    </CardActions>
                </Card>
            ))}
            
            {moments.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    <Typography>No moments yet. Be the first to share!</Typography>
                </Box>
            )}
        </Box>
    );
};
