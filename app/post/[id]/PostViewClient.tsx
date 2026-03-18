'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SocialService } from '@/lib/services/social';
import { UsersService } from '@/lib/services/users';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import { useAuth } from '@/lib/auth';
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Avatar,
    Typography,
    IconButton,
    Button,
    CircularProgress,
    Divider,
    Paper,
    Container,
    alpha,
    Stack,
    Tooltip
} from '@mui/material';
import {
    Heart,
    MessageCircle,
    Repeat2,
    Share,
    ArrowLeft,
    LogIn,
    MoreHorizontal,
    Calendar,
    FileText,
    MapPin,
    Clock,
    Link2,
    Send,
    Edit,
    X
} from 'lucide-react';
import { fetchProfilePreview } from '@/lib/profile-preview';
import { getUserProfilePicId } from '@/lib/user-utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { TextField, InputAdornment, Alert, Menu, MenuItem } from '@mui/material';
import Image from 'next/image';

export function PostViewClient() {
    const params = useParams();
    const router = useRouter();
    const { user, login } = useAuth();
    const [moment, setMoment] = useState<any>(null);
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [pulseMenuAnchorEl, setPulseMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

    const fetchUserAvatar = useCallback(async () => {
        const picId = getUserProfilePicId(user);
        if (picId) {
            try {
                const url = await fetchProfilePreview(picId, 64, 64);
                setUserAvatarUrl(url as unknown as string);
            } catch (_e: unknown) {
                console.warn('Failed to fetch user avatar', _e);
            }
        }
    }, [user]);

    const loadMoment = useCallback(async () => {
        if (!params.id) return;
        setLoading(true);
        try {
            const id = Array.isArray(params.id) ? params.id[0] : params.id;
            const data = await SocialService.getMomentById(id, user?.$id);
            
            // Enrich creator
            const creatorId = data.userId || data.creatorId;
            const creator = await UsersService.getProfileById(creatorId);
            
            let avatar = null;
            if (creator?.avatar) {
                try {
                    const url = await fetchProfilePreview(creator.avatar, 64, 64);
                    avatar = url as unknown as string;
                } catch (_e) {}
            }

            // If this is a reply, resolve the source moment as well
            let sourceMoment = data.sourceMoment;
            if (data.metadata?.sourceId && !sourceMoment) {
                try {
                    const source = await SocialService.getMomentById(data.metadata.sourceId, user?.$id);
                    // Enrich source creator
                    const sCreatorId = source.userId || source.creatorId;
                    const sCreator = await UsersService.getProfileById(sCreatorId);
                    let sAvatar = null;
                    if (sCreator?.avatar) {
                        try {
                            const url = await fetchProfilePreview(sCreator.avatar, 64, 64);
                            sAvatar = url as unknown as string;
                        } catch (_e: unknown) {}
                    }
                    sourceMoment = { ...source, creator: { ...sCreator, avatar: sAvatar } };
                } catch (_e: unknown) {
                    console.warn('Failed to resolve source moment in client', _e);
                }
            }

            setMoment({ ...data, creator: { ...creator, avatar }, sourceMoment });

            // Fetch replies
            const replyData = await SocialService.getReplies(id, user?.$id);
            const enrichedReplies = await Promise.all(replyData.map(async (reply) => {
                const rCreatorId = reply.userId || reply.creatorId;
                const rCreator = await UsersService.getProfileById(rCreatorId);
                let rAvatar = null;
                if (rCreator?.avatar) {
                    try {
                        const url = await fetchProfilePreview(rCreator.avatar, 48, 48);
                        rAvatar = url as unknown as string;
                    } catch (_e: unknown) {}
                }
                return { ...reply, creator: { ...rCreator, avatar: rAvatar } };
            }));
            setReplies(enrichedReplies);

        } catch (_e: unknown) {
            console.error('Failed to load moment:', _e);
            toast.error('Moment not found');
        } finally {
            setLoading(false);
        }
    }, [params.id, user]);

    useEffect(() => {
        loadMoment();
        if (user) fetchUserAvatar();
    }, [loadMoment, user, fetchUserAvatar]);

    const handleToggleLike = async (targetMoment?: any) => {
        if (!user) {
            toast.error('Please login to like this post');
            return;
        }
        const target = targetMoment || moment;
        if (!target) return;

        try {
            const creatorId = target.userId || target.creatorId;
            const contentSnippet = target.caption?.substring(0, 30);
            const { liked } = await SocialService.toggleLike(user.$id, target.$id, creatorId, contentSnippet);
            
            if (target.$id === moment?.$id) {
                setMoment((prev: any) => ({ 
                    ...prev, 
                    isLiked: liked,
                    stats: { ...prev.stats, likes: prev.stats.likes + (liked ? 1 : -1) }
                }));
            } else {
                setReplies((prev: any[]) => prev.map(r => r.$id === target.$id ? {
                    ...r,
                    isLiked: liked,
                    stats: { ...r.stats, likes: r.stats.likes + (liked ? 1 : -1) }
                } : r));
            }
        } catch (_e) {
            toast.error('Failed to update like');
        }
    };

    const handlePulse = async () => {
        if (!user) {
            toast.error('Please login to pulse this post');
            return;
        }
        if (!moment) return;
        try {
            await SocialService.createMoment(user.$id, '', 'pulse', [], 'public', undefined, undefined, moment.$id);
            toast.success('Pulsed to your feed');
            setPulseMenuAnchorEl(null);
            loadMoment();
        } catch (_e) {
            toast.error('Failed to pulse');
        }
    };

    const handleQuote = () => {
        if (!user || !moment) return;
        setPulseMenuAnchorEl(null);
        // UI logic to switch to quote mode
        // For now, we scroll to the reply box and could potentially change its label/behavior
        const replyBox = document.getElementById('reply-box');
        if (replyBox) {
            replyBox.scrollIntoView({ behavior: 'smooth' });
            setReplyContent(`Quoting @${moment.creator?.username}: `);
        }
    };

    const handleReply = async () => {
        if (!user || !moment || !replyContent.trim()) return;
        setReplying(true);
        try {
            await SocialService.createMoment(
                user.$id, 
                replyContent, 
                'reply', 
                [], 
                'public', 
                undefined, 
                undefined, 
                moment.$id
            );
            setReplyContent('');
            toast.success('Reply posted!');
            loadMoment(); // Refresh replies
        } catch (e) {
            console.error('Failed to post reply:', e);
            toast.error('Failed to post reply');
        } finally {
            setReplying(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
    };

    if (loading) return (
        <AppShell>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
                <CircularProgress sx={{ color: '#F59E0B' }} />
            </Box>
        </AppShell>
    );

    if (!moment) return (
        <AppShell>
            <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography variant="h5" color="text.secondary">Moment not found</Typography>
                <Button sx={{ mt: 2 }} onClick={() => router.back()}>Go Back</Button>
            </Box>
        </AppShell>
    );

    const isOwnPost = user?.$id === (moment.userId || moment.creatorId);
    const creatorName = isOwnPost ? (user?.name || 'You') : (moment.creator?.displayName || moment.creator?.username || 'Unknown');
    const creatorAvatar = isOwnPost ? userAvatarUrl : moment.creator?.avatar;

    return (
        <AppShell>
            <Container maxWidth="sm" sx={{ py: { xs: 0.5, sm: 1 } }}>
                {/* Public Access Banner */}
                {!user && (
                    <Alert 
                        severity="info" 
                        icon={<LogIn size={20} />}
                        action={
                            <Button color="inherit" size="small" onClick={login} sx={{ fontWeight: 800 }}>
                                LOGIN
                            </Button>
                        }
                        sx={{ 
                            mb: 2, 
                            borderRadius: '16px', 
                            bgcolor: 'rgba(99, 102, 241, 0.1)', 
                            color: '#6366F1',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            '& .MuiAlert-icon': { color: '#6366F1' }
                        }}
                    >
                        You are viewing this post as a guest. Login to like or reply.
                    </Alert>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <IconButton onClick={() => router.back()} size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.03)' }}>
                        <ArrowLeft size={18} />
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', letterSpacing: '-0.02em' }}>
                        Thread
                    </Typography>
                </Box>

                {/* Parent Post Preview (The Thread Line) */}
                {moment.metadata?.sourceId && moment.sourceMoment && (
                    <Box sx={{ position: 'relative', mb: 0 }}>
                        <Box 
                            onClick={() => router.push(`/post/${moment.sourceMoment.$id}`)}
                            sx={{ 
                                display: 'flex', 
                                gap: 2, 
                                px: 2, 
                                py: 1, 
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar 
                                    src={moment.sourceMoment.creator?.avatar} 
                                    sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.05)' }}
                                />
                                <Box sx={{ width: '2px', flex: 1, bgcolor: 'rgba(255,255,255,0.15)', mt: 1, mb: -1 }} />
                            </Box>
                            <Box sx={{ flex: 1, pt: 0.2 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{moment.sourceMoment.creator?.displayName}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.4 }}>@{moment.sourceMoment.creator?.username}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.3 }}>· {format(new Date(moment.sourceMoment.$createdAt || moment.sourceMoment.createdAt), 'MMM d')}</Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ mt: 0.2, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {moment.sourceMoment.caption}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}

                <Card sx={{ 
                    borderRadius: '24px', 
                    bgcolor: '#161412', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    overflow: 'visible',
                    position: 'relative',
                    '&::before': moment.metadata?.sourceId ? {
                        content: '""',
                        position: 'absolute',
                        top: '-10px',
                        left: '26px',
                        width: '2px',
                        height: '35px',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        zIndex: 0
                    } : {}
                }} elevation={0}>
                    <CardHeader
                        avatar={
                            <Avatar
                                src={creatorAvatar}
                                sx={{ 
                                    width: 48, 
                                    height: 48, 
                                    bgcolor: isOwnPost ? '#F59E0B' : 'rgba(255, 255, 255, 0.05)',
                                    color: isOwnPost ? '#000' : 'text.secondary',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    position: 'relative',
                                    zIndex: 1
                                }}
                            >
                                {creatorName.charAt(0).toUpperCase()}
                            </Avatar>
                        }
                        title={
                            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: isOwnPost ? '#F59E0B' : 'text.primary', fontFamily: 'var(--font-clash)' }}>
                                {creatorName}
                            </Typography>
                        }
                        subheader={
                            <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                @{moment.creator?.username}
                            </Typography>
                        }
                        action={
                            <IconButton sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                <MoreHorizontal size={20} />
                            </IconButton>
                        }
                    />

                    <CardContent sx={{ pt: 1, px: 3 }}>
                        <Typography variant="h5" sx={{ 
                            lineHeight: 1.4, 
                            fontSize: '1.4rem', 
                            fontWeight: 500,
                            mb: 3,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: 'rgba(255,255,255,0.95)',
                            fontFamily: 'var(--font-satoshi)',
                            letterSpacing: '-0.01em'
                        }}>
                            {moment.caption}
                        </Typography>

                        {moment.metadata?.attachments?.filter((a: any) => a.type === 'image' || a.type === 'video').length > 0 && (
                            <Box sx={{ mb: 3, borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                    {moment.metadata.attachments.map((att: any, idx: number) => (
                                        <Box key={idx} sx={{ 
                                            minWidth: '100%', 
                                            height: 300, 
                                            bgcolor: 'rgba(255,255,255,0.02)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative'
                                        }}>
                                            <Image 
                                                src={`https://fra.cloud.appwrite.io/v1/storage/buckets/moments/files/${att.id}/view?project=${APPWRITE_CONFIG.PROJECT_ID}`} 
                                                alt="Attachment"
                                                fill
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {moment.attachedNote && (
                            <Paper sx={{ 
                                p: 0, 
                                borderRadius: 4, 
                                bgcolor: 'rgba(255, 255, 255, 0.02)', 
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                overflow: 'hidden',
                                mb: 3
                            }}>
                                <Box sx={{ p: 3, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(0, 163, 255, 0.02) 100%)' }}>
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Box sx={{ p: 1, bgcolor: alpha('#6366F1', 0.1), borderRadius: 1.5, color: '#6366F1' }}>
                                            <FileText size={22} />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'white' }}>{moment.attachedNote.title}</Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>KYLRIX NOTE</Typography>
                                        </Box>
                                    </Stack>
                                    <Typography variant="body2" sx={{ opacity: 0.7, lineHeight: 1.7 }}>
                                        {moment.attachedNote.content?.substring(0, 200)}...
                                    </Typography>
                                </Box>
                                <Box sx={{ px: 3, py: 1.5, bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 800 }}>ATTACHED KNOWLEDGE</Typography>
                                    <Button size="small" sx={{ fontWeight: 800, color: '#6366F1' }}>Read Note</Button>
                                </Box>
                            </Paper>
                        )}

                        {moment.attachedEvent && (
                            <Paper sx={{ 
                                p: 0, 
                                borderRadius: 4, 
                                bgcolor: 'rgba(255, 255, 255, 0.02)', 
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                overflow: 'hidden',
                                mb: 3
                            }}>
                                <Box sx={{ p: 3, background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(0, 163, 255, 0.02) 100%)' }}>
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Box sx={{ p: 1, bgcolor: alpha('#A855F7', 0.1), borderRadius: 1.5, color: '#A855F7' }}>
                                            <Calendar size={22} />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'white' }}>{moment.attachedEvent.title}</Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>KYLRIX FLOW</Typography>
                                        </Box>
                                    </Stack>
                                    <Stack spacing={1}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'rgba(255,255,255,0.5)' }}>
                                            <Clock size={14} />
                                            <Typography variant="caption" fontWeight={700}>
                                                {format(new Date(moment.attachedEvent.startTime), 'MMM d, h:mm a')}
                                            </Typography>
                                        </Box>
                                        {moment.attachedEvent.location && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'rgba(255,255,255,0.5)' }}>
                                                <MapPin size={14} />
                                                <Typography variant="caption" fontWeight={700}>{moment.attachedEvent.location}</Typography>
                                            </Box>
                                        )}
                                    </Stack>
                                </Box>
                                <Box sx={{ px: 3, py: 1.5, bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: '#A855F7', fontWeight: 800 }}>SCHEDULED EVENT</Typography>
                                    <Button size="small" sx={{ fontWeight: 800, color: '#A855F7' }}>Add to Calendar</Button>
                                </Box>
                            </Paper>
                        )}

                        <Typography variant="body2" sx={{ opacity: 0.4, fontWeight: 700, mt: 4, mb: 2 }}>
                            {format(new Date(moment.$createdAt || moment.createdAt), 'h:mm a · MMM d, yyyy')} · Kylrix Connect
                        </Typography>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', my: 2 }} />
                        
                        <Stack direction="row" spacing={3} sx={{ py: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', color: '#6366F1' }}>
                                <Typography sx={{ fontWeight: 900, fontSize: '1rem' }}>{moment.stats?.replies || 0}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 900, letterSpacing: '0.05em' }}>REPLIES</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', color: '#10B981' }}>
                                <Typography sx={{ fontWeight: 900, fontSize: '1rem' }}>{moment.stats?.pulses || 0}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 900, letterSpacing: '0.05em' }}>PULSES</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', color: '#F59E0B' }}>
                                <Typography sx={{ fontWeight: 900, fontSize: '1rem' }}>{moment.stats?.likes || 0}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 900, letterSpacing: '0.05em' }}>LIKES</Typography>
                            </Box>
                        </Stack>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mt: 1, mb: 2 }} />

                        <Stack direction="row" justifyContent="space-around" sx={{ color: 'rgba(255,255,255,0.5)', py: 1 }}>
                            <Tooltip title="Reply">
                                <IconButton sx={{ '&:hover': { color: '#6366F1', bgcolor: alpha('#6366F1', 0.1) } }}>
                                    <MessageCircle size={24} strokeWidth={1.5} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Pulse">
                                <IconButton 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePulse();
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setPulseMenuAnchorEl(e.currentTarget);
                                    }}
                                    sx={{ '&:hover': { color: '#10B981', bgcolor: alpha('#10B981', 0.1) } }}
                                >
                                    <Repeat2 size={24} strokeWidth={1.5} />
                                </IconButton>
                            </Tooltip>
                            
                            <Menu
                                anchorEl={pulseMenuAnchorEl}
                                open={Boolean(pulseMenuAnchorEl)}
                                onClose={() => setPulseMenuAnchorEl(null)}
                                PaperProps={{
                                    sx: {
                                        mt: 1,
                                        borderRadius: '16px',
                                        bgcolor: 'rgba(15, 15, 15, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        minWidth: 180
                                    }
                                }}
                            >
                                <MenuItem 
                                    onClick={handlePulse}
                                    sx={{ gap: 1.5, py: 1.2, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10B981' }}
                                >
                                    <Repeat2 size={18} strokeWidth={2} /> Pulse Now
                                </MenuItem>
                                <MenuItem 
                                    onClick={handleQuote}
                                    sx={{ gap: 1.5, py: 1.2, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                >
                                    <Edit size={18} strokeWidth={2} style={{ opacity: 0.7 }} /> Quote Moment
                                </MenuItem>
                            </Menu>
                            <Tooltip title="Heart">
                                <IconButton 
                                    onClick={() => handleToggleLike()}
                                    sx={{ 
                                        color: moment.isLiked ? '#F59E0B' : 'inherit',
                                        '&:hover': { color: '#F59E0B', bgcolor: alpha('#F59E0B', 0.1) } 
                                    }}
                                >
                                    <Heart size={24} fill={moment.isLiked ? '#F59E0B' : 'none'} strokeWidth={1.5} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Copy Link">
                                <IconButton onClick={handleCopyLink} sx={{ '&:hover': { color: '#6366F1', bgcolor: alpha('#6366F1', 0.1) } }}>
                                    <Link2 size={24} strokeWidth={1.5} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Share Moment">
                                <IconButton sx={{ '&:hover': { color: '#6366F1', bgcolor: alpha('#6366F1', 0.1) } }}>
                                    <Share size={24} strokeWidth={1.5} />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mt: 2 }} />
                    </CardContent>
                </Card>

                {user && (
                    <Box id="reply-box" sx={{ mt: 3, p: 2, bgcolor: '#161412', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Stack direction="row" spacing={2}>
                            <Avatar src={userAvatarUrl || undefined} sx={{ width: 40, height: 40, borderRadius: '10px' }}>
                                {user.name?.charAt(0)}
                            </Avatar>
                            <TextField
                                fullWidth
                                placeholder="Post your reply"
                                variant="standard"
                                multiline
                                maxRows={10}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                InputProps={{
                                    disableUnderline: true,
                                    sx: { color: 'white', py: 1, fontSize: '1.1rem' },
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton 
                                                onClick={handleReply}
                                                disabled={!replyContent.trim() || replying}
                                                sx={{ 
                                                    bgcolor: '#F59E0B', 
                                                    color: 'black',
                                                    '&:hover': { bgcolor: alpha('#F59E0B', 0.8) },
                                                    '&.Mui-disabled': { bgcolor: 'rgba(245, 158, 11, 0.2)', color: 'rgba(0,0,0,0.3)' }
                                                }}
                                            >
                                                {replying ? <CircularProgress size={20} color="inherit" /> : <Send size={18} />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Stack>
                    </Box>
                )}

                <Stack spacing={2} sx={{ mt: 4 }}>
                    {replies.map((reply) => {
                        const rCreatorName = reply.creator?.displayName || reply.creator?.username || 'Unknown';
                        return (
                            <Box 
                                key={reply.$id} 
                                onClick={() => router.push(`/post/${reply.$id}`)}
                                sx={{ 
                                    display: 'flex', 
                                    gap: 2, 
                                    p: 2, 
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' }
                                }}
                            >
                                <Avatar 
                                    src={reply.creator?.avatar} 
                                    sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.05)' }}
                                >
                                    {rCreatorName.charAt(0)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>{rCreatorName}</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.4 }}>@{reply.creator?.username}</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.4 }}>· {format(new Date(reply.$createdAt), 'MMM d')}</Typography>
                                    </Stack>
                                    <Typography sx={{ mt: 0.5, color: 'rgba(255,255,255,0.8)', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                                        {reply.caption}
                                    </Typography>
                                    
                                    <Stack direction="row" spacing={4} sx={{ mt: 1.5, color: 'rgba(255,255,255,0.4)' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconButton size="small" sx={{ p: 0.5, '&:hover': { color: '#6366F1' } }}>
                                                <MessageCircle size={16} />
                                            </IconButton>
                                            <Typography variant="caption">{reply.stats?.replies || 0}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconButton size="small" sx={{ p: 0.5, '&:hover': { color: '#10B981' } }}>
                                                <Repeat2 size={16} />
                                            </IconButton>
                                            <Typography variant="caption">{reply.stats?.pulses || 0}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleLike(reply);
                                                }}
                                                sx={{ 
                                                    p: 0.5, 
                                                    color: reply.isLiked ? '#F59E0B' : 'inherit',
                                                    '&:hover': { color: '#F59E0B' } 
                                                }}
                                            >
                                                <Heart size={16} fill={reply.isLiked ? '#F59E0B' : 'none'} />
                                            </IconButton>
                                            <Typography variant="caption">{reply.stats?.likes || 0}</Typography>
                                        </Box>
                                    </Stack>
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            </Container>
        </AppShell>
    );
}
