'use client';

import React, { useEffect, useState } from 'react';
import { SocialService } from '@/lib/services/social';
import { UsersService } from '@/lib/services/users';
import { ChatService } from '@/lib/services/chat';
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
    Divider,
    Menu,
    MenuItem,
    alpha
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import CommentIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import BookmarkIcon from '@mui/icons-material/BookmarkBorderOutlined';
import { useRouter } from 'next/navigation';
import { fetchProfilePreview } from '@/lib/profile-preview';
import { getUserProfilePicId } from '@/lib/user-utils';
import { NoteSelectorModal } from './NoteSelectorModal';
import { NoteViewDrawer } from './NoteViewDrawer';
import DescriptionIcon from '@mui/icons-material/Description';
import AttachFileIcon from '@mui/icons-material/AttachFile';

export const Feed = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [moments, setMoments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMoment, setNewMoment] = useState('');
    const [posting, setPosting] = useState(false);
    const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
    
    const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedMoment, setSelectedMoment] = useState<any>(null);

    // Note Integration State
    const [isNoteModalOpen, setIsNoteSelectorOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [viewingNote, setViewingNote] = useState<any>(null);
    const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);

    useEffect(() => {
        if (user) {
            loadFeed();
            fetchUserAvatar();
        }
    }, [user]);

    const fetchUserAvatar = async () => {
        const picId = getUserProfilePicId(user);
        if (picId) {
            try {
                const url = await fetchProfilePreview(picId, 64, 64);
                setUserAvatarUrl(url as unknown as string);
            } catch (e) {
                console.warn('Feed failed to fetch user avatar', e);
            }
        }
    };

    const loadFeed = async () => {
        if (!user?.$id) return;
        try {
            const response = await SocialService.getFeed(user.$id);
            // Enrich with creator details and avatars
            const enriched = await Promise.all(response.rows.map(async (moment: any) => {
                try {
                    const creatorId = moment.userId || moment.creatorId;
                    const creator = await UsersService.getProfileById(creatorId);
                    
                    let avatarUrl = null;
                    const picId = creator?.profilePicId || creator?.avatarFileId || creator?.avatarUrl || creator?.avatar;
                    if (picId && typeof picId === 'string' && picId.length > 5) {
                        try {
                            const url = await fetchProfilePreview(picId, 64, 64);
                            avatarUrl = url as unknown as string;
                        } catch (e) {}
                    }

                    return { ...moment, creator: { ...creator, avatarUrl } };
                } catch (e) {
                    return { ...moment, creator: { username: 'user', $id: moment.userId || moment.creatorId } };
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
        if (!newMoment.trim() && !selectedNote) return;
        setPosting(true);
        try {
            await SocialService.createMoment(user!.$id, newMoment, 'text', [], 'public', selectedNote?.$id);
            setNewMoment('');
            setSelectedNote(null);
            loadFeed();
        } catch (error) {
            console.error('Failed to post:', error);
        } finally {
            setPosting(false);
        }
    };

    const handleOpenNote = (note: any) => {
        setViewingNote(note);
        setIsNoteDrawerOpen(true);
    };

    const handleForwardToSaved = async (moment: any) => {
        if (!user) return;
        try {
            // Find saved messages conversation
            const convs = await ChatService.getConversations(user.$id);
            const savedChat = convs.rows.find((c: any) => 
                c.type === 'direct' && c.participants.length === 1 && c.participants[0] === user.$id
            );

            if (savedChat) {
                await ChatService.sendMessage(
                    savedChat.$id, 
                    user.$id, 
                    `Forwarded Moment from @${moment.creator?.username}:\n\n${moment.caption}`,
                    'text'
                );
                alert('Saved to Messages');
            }
        } catch (e) {
            console.error('Forward failed:', e);
        }
        setShareAnchorEl(null);
    };

    const handleForwardToChat = (moment: any) => {
        // In a real app, this would open a 'Select Contact' dialog
        // For now, let's redirect to chats with a hint
        router.push('/chats');
        setShareAnchorEl(null);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>;

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 1, sm: 2 } }}>
            {/* Create Post */}
            {user && (
                <Card sx={{ mb: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }} elevation={0}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Avatar 
                                src={userAvatarUrl || undefined}
                                sx={{ bgcolor: 'rgba(0, 240, 255, 0.1)', color: 'primary.main', fontWeight: 800 }}
                            >
                                {user.name?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                            <TextField
                                fullWidth
                                placeholder="Share an update with the ecosystem..."
                                multiline
                                rows={2}
                                variant="standard"
                                InputProps={{ 
                                    disableUnderline: true,
                                    sx: { fontSize: '1.1rem', fontWeight: 500 }
                                }}
                                value={newMoment}
                                onChange={(e) => setNewMoment(e.target.value)}
                            />
                        </Box>

                        {selectedNote && (
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    mt: 2, 
                                    p: 2, 
                                    borderRadius: 3, 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    bgcolor: 'rgba(0, 240, 255, 0.03)',
                                    borderColor: 'rgba(0, 240, 255, 0.2)',
                                    position: 'relative'
                                }}
                            >
                                <DescriptionIcon color="primary" sx={{ mr: 2 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                                        {selectedNote.title || 'Untitled Note'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                        {selectedNote.content?.substring(0, 60).replace(/[#*`]/g, '')}...
                                    </Typography>
                                </Box>
                                <IconButton 
                                    size="small" 
                                    onClick={() => setSelectedNote(null)}
                                    sx={{ ml: 1 }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Paper>
                        )}
                    </CardContent>
                    <Divider sx={{ opacity: 0.05 }} />
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
                        <Button
                            startIcon={<AttachFileIcon />}
                            onClick={() => setIsNoteSelectorOpen(true)}
                            sx={{ 
                                borderRadius: '10px', 
                                textTransform: 'none', 
                                fontWeight: 700,
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main', bgcolor: 'rgba(0, 240, 255, 0.05)' }
                            }}
                        >
                            Attach Note
                        </Button>
                        <Button 
                            variant="contained" 
                            disabled={(!newMoment.trim() && !selectedNote) || posting}
                            onClick={handlePost}
                            sx={{ 
                                borderRadius: '12px', 
                                px: 4, 
                                fontWeight: 800,
                                textTransform: 'none',
                                bgcolor: 'primary.main',
                                color: 'black',
                                '&:hover': { bgcolor: alpha('#00F0FF', 0.8) }
                            }}
                        >
                            {posting ? <CircularProgress size={20} color="inherit" /> : 'Post'}
                        </Button>
                    </CardActions>
                </Card>
            )}

            {/* Feed */}
            {moments.map((moment) => (
                <Card key={moment.$id} sx={{ mb: 3, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s ease', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' } }} elevation={0}>
                    <CardHeader
                        avatar={
                            <Avatar 
                                src={moment.creator?.avatarUrl || undefined}
                                sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'text.secondary', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                            >
                                {moment.creator?.username?.charAt(0).toUpperCase() || '?'}
                            </Avatar>
                        }
                        title={
                            <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>
                                {moment.creator?.displayName || moment.creator?.username || 'Unknown'}
                            </Typography>
                        }
                        subheader={
                            <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 600 }}>
                                {new Date(moment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        }
                    />
                    <CardContent sx={{ pt: 0, px: 3 }}>
                        {moment.caption && (
                            <Typography variant="body1" sx={{ lineHeight: 1.6, fontSize: '1.05rem', mb: moment.attachedNote ? 2 : 0 }}>
                                {moment.caption}
                            </Typography>
                        )}

                        {moment.attachedNote && (
                            <Paper
                                variant="outlined"
                                onClick={() => handleOpenNote(moment.attachedNote)}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                                    borderColor: 'rgba(255, 255, 255, 0.08)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 240, 255, 0.05)',
                                        borderColor: 'rgba(0, 240, 255, 0.3)',
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                    <DescriptionIcon color="primary" sx={{ mr: 1.5 }} />
                                    <Typography variant="subtitle1" fontWeight={900}>
                                        {moment.attachedNote.title || 'Untitled Note'}
                                    </Typography>
                                </Box>
                                <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ 
                                        lineHeight: 1.6,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {moment.attachedNote.content?.replace(/[#*`]/g, '')}
                                </Typography>
                                <Box sx={{ display: 'flex', mt: 2, alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800 }}>
                                        Click to read note
                                    </Typography>
                                </Box>
                            </Paper>
                        )}
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                        <Button 
                            startIcon={<FavoriteBorderIcon />} 
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { color: '#ff4d4d', bgcolor: alpha('#ff4d4d', 0.1) } }}
                        >
                            Like
                        </Button>
                        <Button 
                            startIcon={<CommentIcon />} 
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                        >
                            Reply
                        </Button>
                        <IconButton 
                            onClick={(e) => { setShareAnchorEl(e.currentTarget); setSelectedMoment(moment); }}
                            sx={{ ml: 'auto', color: 'text.secondary' }}
                        >
                            <ShareIcon />
                        </IconButton>
                    </CardActions>
                </Card>
            ))}
            
            <Menu
                anchorEl={shareAnchorEl}
                open={Boolean(shareAnchorEl)}
                onClose={() => setShareAnchorEl(null)}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: '16px',
                        bgcolor: 'rgba(15, 15, 15, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        minWidth: 200
                    }
                }}
            >
                <MenuItem onClick={() => handleForwardToSaved(selectedMoment)} sx={{ gap: 1.5, py: 1.2, fontWeight: 600 }}>
                    <BookmarkIcon sx={{ fontSize: 20, opacity: 0.7 }} /> Save to Messages
                </MenuItem>
                <MenuItem onClick={() => handleForwardToChat(selectedMoment)} sx={{ gap: 1.5, py: 1.2, fontWeight: 600 }}>
                    <SendIcon sx={{ fontSize: 20, opacity: 0.7 }} /> Forward to Chat
                </MenuItem>
            </Menu>

            {moments.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'rgba(255, 255, 255, 0.01)', borderRadius: '32px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>No moments in the feed yet.</Typography>
                    <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>Be the first to share an update!</Typography>
                </Box>
            )}

            <NoteSelectorModal 
                open={isNoteModalOpen}
                onClose={() => setIsNoteSelectorOpen(false)}
                onSelect={(note) => setSelectedNote(note)}
            />

            <NoteViewDrawer 
                open={isNoteDrawerOpen}
                onClose={() => setIsNoteDrawerOpen(false)}
                note={viewingNote}
            />
        </Box>
    );
};
