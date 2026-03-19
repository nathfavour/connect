'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
    Paper,
    alpha,
    Tooltip,
    Stack,
    Fab,
    useMediaQuery,
    useTheme,
    Skeleton
} from '@mui/material';
import {
    Heart,
    MessageCircle,
    Repeat2,
    Share,
    Bookmark,
    X,
    FileText,
    Calendar,
    Send,
    MapPin,
    Clock,
    MoreHorizontal,
    Trash2,
    Edit,
    Image as ImageIcon,
    Plus,
    Search,
    Phone,
    Video
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchProfilePreview } from '@/lib/profile-preview';
import { getUserProfilePicId } from '@/lib/user-utils';
import { FormattedText } from '../common/FormattedText';
import { NoteSelectorModal } from './NoteSelectorModal';
import { NoteViewDrawer } from './NoteViewDrawer';
import { EventSelectorModal } from './EventSelectorModal';
import { EventViewDrawer } from './EventViewDrawer';
import { CallSelectorModal } from './CallSelectorModal';

import toast from 'react-hot-toast';

const CACHE_KEY = 'kylrix_feed_cache';
const profileRegistry = new Map<string, any>();

const FeedSkeleton = () => (
    <Stack spacing={3}>
        {[1, 2, 3].map((i) => (
            <Card key={i} sx={{ borderRadius: '24px', bgcolor: '#161412', border: '1px solid rgba(255, 255, 255, 0.05)' }} elevation={0}>
                <CardHeader
                    avatar={<Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />}
                    title={<Skeleton width="40%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />}
                    subheader={<Skeleton width="20%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />}
                />
                <CardContent>
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                </CardContent>
            </Card>
        ))}
    </Stack>
);

const NewPostsWidget = ({ pendingMoments, onClick }: { pendingMoments: any[], onClick: () => void }) => {
    return (
        <Box 
            onClick={onClick}
            sx={{ 
                position: 'fixed', 
                top: 80, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 1000,
                bgcolor: '#F59E0B',
                color: 'black',
                px: 2,
                py: 1,
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { transform: 'translateX(-50%) translateY(-2px)', bgcolor: alpha('#F59E0B', 0.9) },
                '&:active': { transform: 'translateX(-50%) scale(0.95)' }
            }}
        >
            <Box sx={{ display: 'flex', ml: -0.5 }}>
                {pendingMoments.slice(0, 3).map((m, i) => (
                    <Avatar 
                        key={m.$id} 
                        src={m.creator?.avatar} 
                        sx={{ 
                            width: 24, 
                            height: 24, 
                            border: '2px solid #F59E0B', 
                            ml: i === 0 ? 0 : -1,
                            zIndex: 3 - i,
                            fontSize: '0.65rem',
                            bgcolor: '#161412',
                            color: '#F59E0B'
                        }}
                    >
                        {m.creator?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                ))}
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em' }}>
                {pendingMoments.length} new {pendingMoments.length === 1 ? 'post' : 'posts'}
            </Typography>
        </Box>
    );
};

interface FeedProps {
    view?: 'personal' | 'trending' | 'search';
}

export const Feed = ({ view = 'personal' }: FeedProps) => {
    const { user } = useAuth();
    const router = useRouter();
    const [moments, setMoments] = useState<any[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(`${CACHE_KEY}_${view}`);
            return cached ? JSON.parse(cached) : [];
        }
        return [];
    });
    const [loading, setLoading] = useState(false);
    const [newMoment, setNewMoment] = useState('');
    const [posting, setPosting] = useState(false);
    const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
    const [pendingMoments, setPendingMoments] = useState<any[]>([]);
    const [showNewPosts, setShowNewPosts] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [momentSearchResults, setMomentSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedCall, setSelectedCall] = useState<any>(null);
    const [pulseTarget, setPulseTarget] = useState<any>(null);
    const [isNoteModalOpen, setIsNoteSelectorOpen] = useState(false);
    const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
    const [viewingNote, setViewingNote] = useState<any>(null);
    const [isEventModalOpen, setIsEventSelectorOpen] = useState(false);
    const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false);
    const [viewingEvent, setViewingEvent] = useState<any>(null);
    const [isCallModalOpen, setIsCallSelectorOpen] = useState(false);
    const [postMenuAnchorEl, setPostMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [pulseMenuAnchorEl, setPulseMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
    const [menuMoment, setMenuMoment] = useState<any>(null);
    const [selectedMoment, setSelectedMoment] = useState<any>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        // Hydrate from localStorage immediately on mount
        const cached = localStorage.getItem(`${CACHE_KEY}_${view}`);
        if (cached) {
            setMoments(JSON.parse(cached));
        }
    }, [view]);

    const saveToCache = useCallback((data: any[]) => {
        localStorage.setItem(`${CACHE_KEY}_${view}`, JSON.stringify(data.slice(0, 50)));
    }, [view]);

    const fetchUserAvatar = useCallback(async () => {

        const picId = getUserProfilePicId(user);
        if (picId) {
            try {
                const url = await fetchProfilePreview(picId, 64, 64);
                setUserAvatarUrl(url as unknown as string);
            } catch (_e: unknown) {
                console.warn('Feed failed to fetch user avatar');
            }
        }
    }, [user]);

    const handleToggleLike = async (e: React.MouseEvent, moment: any) => {
        e.stopPropagation();
        if (!user) {
            toast.error('Please login to like this post');
            return;
        }
        try {
            const creatorId = moment.userId || moment.creatorId;
            const contentSnippet = moment.caption?.substring(0, 30);
            const { liked } = await SocialService.toggleLike(user.$id, moment.$id, creatorId, contentSnippet);
            
            // Update local state
            setMoments((prev: any[]) => prev.map((m: any) => m.$id === moment.$id ? {
                ...m,
                isLiked: liked,
                stats: { ...m.stats, likes: Math.max(0, (m.stats?.likes || 0) + (liked ? 1 : -1)) }
            } : m));
        } catch (_e) {
            toast.error('Failed to update like');
        }
    };

    const handleDeletePost = async (momentId: string) => {
        if (!confirm('Are you sure you want to delete this moment?')) return;
        try {
            await SocialService.deleteMoment(momentId);
            setMoments(prev => prev.filter(m => m.$id !== momentId));
            toast.success('Moment deleted');
            setPostMenuAnchorEl(null);
        } catch (_e) {
            toast.error('Failed to delete moment');
        }
    };

    const loadFeed = useCallback(async () => {
        // Do not set global loading if we already have cached content to show
        if (moments.length === 0) setLoading(true);
        
        try {
            const response = view === 'trending' ? 
                await SocialService.getTrendingFeed(user?.$id) : 
                await SocialService.getFeed(user?.$id);
                
            const rows = response?.rows || [];
            
            // Phase 1: Render raw posts immediately (O(N) for render, O(1) for feeling)
            setMoments(prev => {
                const combined = rows.map((row: any) => {
                    const cached = prev.find(p => p.$id === row.$id);
                    return cached ? { ...row, ...cached } : row;
                });
                saveToCache(combined);
                return combined;
            });
            setLoading(false);

            // Phase 2: Background Hydration using Profile Registry Singleton
            const uniqueCreatorIds = Array.from(new Set(rows.map((m: any) => m.userId || m.creatorId)));
            
            await Promise.all(uniqueCreatorIds.map(async (id: any) => {
                if (profileRegistry.has(id)) return;
                
                try {
                    const profile = await UsersService.getProfileById(id);
                    let avatar = null;
                    if (profile?.avatar && profile.avatar.length > 5) {
                        avatar = await fetchProfilePreview(profile.avatar, 64, 64) as unknown as string;
                    }
                    profileRegistry.set(id, { ...profile, avatar });
                    
            // Trigger a single state update for all posts by this creator
                    setMoments(prev => {
                        return prev.map(m => {
                            let updated = m;
                            const mCreatorId = m.userId || m.creatorId;
                            if (mCreatorId === id) {
                                updated = { ...updated, creator: profileRegistry.get(id) };
                            }
                            // Also hydrate sourceMoment creators if they match this ID
                            if (updated.sourceMoment) {
                                const sCreatorId = updated.sourceMoment.userId || updated.sourceMoment.creatorId;
                                if (sCreatorId === id) {
                                    updated = { 
                                        ...updated, 
                                        sourceMoment: { ...updated.sourceMoment, creator: profileRegistry.get(id) } 
                                    };
                                }
                            }
                            return updated;
                        });
                    });
                } catch (_e) {
                    profileRegistry.set(id, { username: 'user', displayName: 'Kylrix User', $id: id });
                }
            }));
            
            // Final Cache Save
            setMoments(prev => {
                saveToCache(prev);
                return prev;
            });

        } catch (error: unknown) {
            console.error('Failed to load feed:', error);
            if (moments.length === 0) setMoments([]);
        } finally {
            setLoading(false);
        }
    }, [user, view, moments.length, saveToCache]);


    useEffect(() => {
        fetchUserAvatar();
    }, [fetchUserAvatar]);

    useEffect(() => {
        loadFeed();
    }, [view, user?.$id, loadFeed]);

    useEffect(() => {
        // Real-time subscription for new posts
        const unsubFunc = SocialService.subscribeToFeed(async (event) => {
            if (event.type === 'create') {
                const moment = event.payload;

                // For trending view, we only care about new posts if they might be trending, 
                // but for live feel we add them to 'personal' immediately.
                if (view === 'trending') return;

                const creatorId = moment.userId || moment.creatorId;
                try {
                    const creator = await UsersService.getProfileById(creatorId);

                    let avatar = null;
                    const picId = creator?.avatar;
                    if (picId && typeof picId === 'string' && picId.length > 5) {
                        try {
                            const url = await fetchProfilePreview(picId, 64, 64);
                            avatar = url as unknown as string;
                        } catch (_e: unknown) { }
                    }

                    const enrichedMoment = await SocialService.enrichMoment({
                        ...moment,
                        creator: creator ? { ...creator, avatar } : {
                            username: 'user',
                            displayName: 'Kylrix User',
                            avatar: null,
                            $id: creatorId
                        }
                    }, user?.$id);

                    // Phase 3: Check for sourceMoment enrichment if it's a reply/pulse/quote
                    if (enrichedMoment.sourceMoment && !enrichedMoment.sourceMoment.creator) {
                        const sourceCreatorId = enrichedMoment.sourceMoment.userId || enrichedMoment.sourceMoment.creatorId;
                        try {
                            const sourceCreator = await UsersService.getProfileById(sourceCreatorId);
                            let sourceAvatar = null;
                            if (sourceCreator?.avatar) {
                                sourceAvatar = await fetchProfilePreview(sourceCreator.avatar, 64, 64) as unknown as string;
                            }
                            enrichedMoment.sourceMoment.creator = { ...sourceCreator, avatar: sourceAvatar };
                        } catch (_e) {}
                    }

                    if (window.scrollY > 300) {
                        setPendingMoments(prev => [enrichedMoment, ...prev]);
                        setShowNewPosts(true);
                    } else {
                        setMoments(prev => {
                            if (prev.some(m => m.$id === enrichedMoment.$id)) return prev;
                            const updated = [enrichedMoment, ...prev];
                            saveToCache(updated);
                            return updated;
                        });
                    }
                } catch (_e: unknown) {
                    console.warn('Failed to enrich real-time moment');
                }
            } else if (event.type === 'delete') {
                setMoments(prev => prev.filter(m => m.$id !== event.payload.$id));
            } else if (event.type === 'update') {
                const payload = event.payload as any;
                // If it's just an interaction update, re-fetch the specific moment stats
                if (payload._interactionUpdate) {
                    const updatedStats = await SocialService.getInteractionCounts(payload.$id);
                    const isLiked = user?.$id ? await SocialService.isLiked(user.$id, payload.$id) : false;
                    setMoments(prev => prev.map(m => m.$id === payload.$id ? { ...m, stats: updatedStats, isLiked } : m));
                } else {
                    // Standard update (e.g. caption changed)
                    const enriched = await SocialService.enrichMoment(payload, user?.$id);
                    setMoments(prev => prev.map(m => m.$id === enriched.$id ? { ...m, ...enriched } : m));
                }
            }
        });

        return () => {
            if (typeof unsubFunc === 'function') {
                const result = unsubFunc();
                if (result instanceof Promise) result.catch(e => console.error('Cleanup failed', e));
            }
        };
    }, [user, view, loadFeed, saveToCache]);

    const handlePost = async () => {
        if (!newMoment.trim() && !selectedNote && !selectedEvent && !selectedCall && !pulseTarget && selectedFiles.length === 0) return;
        setPosting(true);
        try {
            // Upload files first
            const mediaIds: string[] = [];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const id = await SocialService.uploadMedia(file);
                    mediaIds.push(id);
                }
            }

            const type = pulseTarget ? 'quote' : 'post';
            const createdMoment = await SocialService.createMoment(user!.$id, newMoment, type, mediaIds, 'public', selectedNote?.$id, selectedEvent?.$id, pulseTarget?.$id, selectedCall?.$id);
            
            // Enrich and add to local state immediately for instant feedback
            const enriched = await SocialService.enrichMoment(createdMoment, user!.$id);
            setMoments(prev => {
                if (prev.some(m => m.$id === enriched.$id)) return prev;
                const updated = [enriched, ...prev];
                saveToCache(updated);
                return updated;
            });

            setNewMoment('');
            setSelectedNote(null);
            setSelectedEvent(null);
            setSelectedCall(null);
            setPulseTarget(null);
            setSelectedFiles([]);
            // Scroll to top to see own post
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: unknown) {
            console.error('Failed to post:', error);
            toast.error('Failed to post moment');
        } finally {
            setPosting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...files]);
        }
    };

    const handleQuote = (moment: any) => {
        // Open composer with sourceMoment set
        setPulseTarget(moment);
        setPulseMenuAnchorEl(null);
        // Ensure composer is visible and focused
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePulse = async (moment: any) => {
        if (!user) return;
        const pulse = moments.find(m => m.metadata?.type === 'pulse' && m.metadata?.sourceId === moment.$id && (m.userId === user.$id || m.creatorId === user.$id));
        
        if (pulse) {
            // Undo Pulse (Unpulse)
            try {
                const success = await SocialService.unpulseMoment(user.$id, moment.$id);
                if (success) {
                    toast.success('Removed from your feed');
                    setMoments(prev => prev.filter(m => m.$id !== pulse.$id));
                    // Update the source moment's count locally
                    setMoments(prev => prev.map(m => m.$id === moment.$id ? {
                        ...m,
                        stats: { ...m.stats, pulses: Math.max(0, (m.stats?.pulses || 0) - 1) }
                    } : m));
                }
            } catch (_e) {
                toast.error('Failed to remove pulse');
            }
        } else {
            // Create Pulse
            try {
                // Instant Pulse (Repost) logic - minimal payload
                await SocialService.createMoment(user.$id, '', 'pulse', [], 'public', undefined, undefined, moment.$id);
                toast.success('Pulsed to your feed');
                loadFeed();
            } catch (_e) {
                toast.error('Failed to pulse');
            }
        }
        setPulseMenuAnchorEl(null);
    };

    const handleOpenNote = (note: any) => {
        setViewingNote(note);
        setIsNoteDrawerOpen(true);
    };

    const handleOpenEvent = (event: any) => {
        setViewingEvent(event);
        setIsEventDrawerOpen(true);
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
        } catch (_e) {
            toast.error('Failed to update like');
        }
    };

    const handleForwardToChat = (moment: any) => {
        if (!moment) return;
        setShareAnchorEl(null);
        // This is a placeholder for a more complex "Share to Chat" flow
        // For now, we'll just redirect to the chat list and the user can forward there
        router.push('/messages');
        toast.success("Select a conversation to share this moment");
    };

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setMomentSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            // Search Users and Moments in parallel
            const [userResult, momentResult] = await Promise.all([
                UsersService.searchUsers(query),
                SocialService.searchMoments(query, user?.$id)
            ]);

            // Enrich User Results
            const enrichedUsers = await Promise.all(userResult.rows.map(async (u: any) => {
                let avatar = null;
                if (u.avatar) {
                    try {
                        const url = await fetchProfilePreview(u.avatar, 64, 64);
                        avatar = url as unknown as string;
                    } catch (_e) {}
                }
                return { ...u, avatar };
            }));

            // Enrich Moment Results with Creator Info
            const enrichedMoments = await Promise.all(momentResult.rows.map(async (m: any) => {
                const creatorId = m.userId || m.creatorId;
                if (profileRegistry.has(creatorId)) {
                    return { ...m, creator: profileRegistry.get(creatorId) };
                }
                try {
                    const profile = await UsersService.getProfileById(creatorId);
                    let avatar = null;
                    if (profile?.avatar) {
                        avatar = await fetchProfilePreview(profile.avatar, 64, 64) as unknown as string;
                    }
                    const enrichedCreator = { ...profile, avatar };
                    profileRegistry.set(creatorId, enrichedCreator);
                    return { ...m, creator: enrichedCreator };
                } catch (_e) {
                    return m;
                }
            }));

            setSearchResults(enrichedUsers);
            setMomentSearchResults(enrichedMoments);
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            setSearching(false);
        }
    }, [user?.$id]);

    useEffect(() => {
        if (view === 'search') {
            const timer = setTimeout(() => {
                handleSearch(searchQuery);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, handleSearch, view]);

    const handleNewPostsClick = () => {
        setMoments(prev => {
            const updated = [...pendingMoments, ...prev];
            saveToCache(updated);
            return updated;
        });
        setPendingMoments([]);
        setShowNewPosts(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isEmpty = !loading && moments.length === 0;

    if (view === 'search' || isSearchOpen) {
        return (
            <Box>
                <Paper sx={{ 
                    p: 1.5, 
                    mb: 4, 
                    borderRadius: '20px', 
                    bgcolor: '#161412', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                }}>
                    {isSearchOpen && (
                        <IconButton onClick={() => setIsSearchOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            <X size={20} />
                        </IconButton>
                    )}
                    <Search size={20} color="#F59E0B" style={{ marginLeft: isSearchOpen ? '0' : '12px', opacity: 0.6 }} />
                    <TextField 
                        fullWidth
                        placeholder="Search for people by name or @username..."
                        variant="standard"
                        InputProps={{ disableUnderline: true, sx: { fontSize: '1rem', fontWeight: 600 } }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </Paper>

                {searching && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: '#F59E0B' }} /></Box>}
                
                <Stack spacing={3}>
                    {searchResults.length > 0 && (
                        <Box>
                            <Typography variant="overline" sx={{ opacity: 0.5, fontWeight: 900, ml: 1, mb: 1, display: 'block' }}>People</Typography>
                            <Stack spacing={1}>
                                {searchResults.map((u) => (
                                    <Paper 
                                        key={u.$id}
                                        onClick={() => router.push(`/@${u.username}`)}
                                        sx={{ 
                                            p: 2, 
                                            borderRadius: '16px', 
                                            bgcolor: '#161412', 
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { bgcolor: '#1C1A18', transform: 'translateX(4px)', borderColor: 'rgba(245, 158, 11, 0.3)' }
                                        }}
                                    >
                                        <Avatar src={u.avatar} sx={{ width: 48, height: 48, bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', fontWeight: 800 }}>
                                            {u.username?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontWeight: 800 }}>{u.displayName || u.username}</Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700 }}>@{u.username}</Typography>
                                        </Box>
                                        <IconButton size="small" sx={{ color: '#F59E0B' }}>
                                            <Plus size={20} />
                                        </IconButton>
                                    </Paper>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {momentSearchResults.length > 0 && (
                        <Box>
                            <Typography variant="overline" sx={{ opacity: 0.5, fontWeight: 900, ml: 1, mb: 1, display: 'block' }}>Moments</Typography>
                            <Stack spacing={2}>
                                {momentSearchResults.map((moment) => {
                                    const isOwnPost = user?.$id === (moment.userId || moment.creatorId);
                                    const creatorName = isOwnPost ? (user?.name || 'You') : (moment.creator?.displayName || moment.creator?.username || 'Unknown');
                                    const creatorAvatar = isOwnPost ? userAvatarUrl : (moment.creator?.avatar || undefined);

                                    return (
                                        <Card 
                                            key={moment.$id} 
                                            onClick={() => router.push(`/post/${moment.$id}`)}
                                            sx={{ 
                                                borderRadius: '24px', 
                                                bgcolor: '#161412', 
                                                border: '1px solid rgba(255, 255, 255, 0.05)', 
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease', 
                                                '&:hover': { bgcolor: '#1C1A18', borderColor: 'rgba(245, 158, 11, 0.2)' } 
                                            }} 
                                            elevation={0}
                                        >
                                            <CardHeader
                                                avatar={<Avatar src={creatorAvatar} sx={{ width: 32, height: 32, borderRadius: '8px' }} />}
                                                title={<Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{creatorName}</Typography>}
                                                subheader={<Typography variant="caption" sx={{ opacity: 0.5 }}>{new Date(moment.createdAt).toLocaleDateString()}</Typography>}
                                            />
                                            <CardContent sx={{ pt: 0 }}>
                                                <Typography variant="body2" sx={{ opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {moment.caption}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}

                    {!searching && searchQuery && searchResults.length === 0 && momentSearchResults.length === 0 && (
                        <Typography sx={{ textAlign: 'center', py: 8, opacity: 0.4, fontWeight: 600 }}>No results found for &quot;{searchQuery}&quot;</Typography>
                    )}
                    {!searchQuery && (
                        <Box sx={{ textAlign: 'center', py: 8, opacity: 0.4 }}>
                            <Search size={48} style={{ marginBottom: '16px' }} />
                            <Typography sx={{ fontWeight: 700 }}>Search the Kylrix Ecosystem</Typography>
                            <Typography variant="body2">Find friends, creators, and moments.</Typography>
                        </Box>
                    )}
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 1, sm: 2 }, position: 'relative' }}>
            {/* Search Toggle Button */}
            {!isSearchOpen && (view as any) !== 'search' && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button
                        onClick={() => setIsSearchOpen(true)}
                        startIcon={<Search size={18} />}
                        sx={{
                            borderRadius: '12px',
                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            color: 'rgba(255, 255, 255, 0.5)',
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 2,
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.06)',
                                borderColor: 'rgba(245, 158, 11, 0.3)',
                                color: '#F59E0B'
                            }
                        }}
                    >
                        Search Ecosystem
                    </Button>
                </Box>
            )}
            {showNewPosts && pendingMoments.length > 0 && (
                <NewPostsWidget 
                    pendingMoments={pendingMoments} 
                    onClick={handleNewPostsClick} 
                />
            )}
            {/* Create Post */}
            {user && (
                <Card sx={{ mb: 4, borderRadius: '24px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }} elevation={0}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Avatar
                                src={userAvatarUrl || undefined}
                                sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', fontWeight: 800 }}
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
                                <FileText size={20} color="#6366F1" style={{ marginRight: '16px' }} strokeWidth={1.5} />
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
                                    <X size={16} strokeWidth={1.5} />
                                </IconButton>
                            </Paper>
                        )}

                        {selectedEvent && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    bgcolor: 'rgba(0, 163, 255, 0.03)',
                                    borderColor: 'rgba(0, 163, 255, 0.2)',
                                    position: 'relative'
                                }}
                            >
                                <Calendar size={20} color="#00A3FF" style={{ marginRight: '16px' }} strokeWidth={1.5} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                                        {selectedEvent.title || 'Untitled Event'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                        {new Date(selectedEvent.startTime).toLocaleString()}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={() => setSelectedEvent(null)}
                                    sx={{ ml: 1 }}
                                >
                                    <X size={16} strokeWidth={1.5} />
                                </IconButton>
                            </Paper>
                        )}

                        {selectedCall && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    bgcolor: 'rgba(245, 158, 11, 0.03)',
                                    borderColor: 'rgba(245, 158, 11, 0.2)',
                                    position: 'relative'
                                }}
                            >
                                {selectedCall.type === 'video' ? <Video size={20} color="#F59E0B" style={{ marginRight: '16px' }} strokeWidth={1.5} /> : <Phone size={20} color="#F59E0B" style={{ marginRight: '16px' }} strokeWidth={1.5} />}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                                        {selectedCall.title || `${selectedCall.type.charAt(0).toUpperCase() + selectedCall.type.slice(1)} Call`}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                        Starts: {new Date(selectedCall.startsAt).toLocaleString()}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={() => setSelectedCall(null)}
                                    sx={{ ml: 1 }}
                                >
                                    <X size={16} strokeWidth={1.5} />
                                </IconButton>
                            </Paper>
                        )}

                        {pulseTarget && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(16, 185, 129, 0.03)',
                                    borderColor: 'rgba(16, 185, 129, 0.2)',
                                    position: 'relative'
                                }}
                            >
                                <Repeat2 size={20} color="#10B981" style={{ marginRight: '16px' }} strokeWidth={1.5} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                                        Quoting @{pulseTarget.creator?.username}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                        {pulseTarget.caption?.substring(0, 60)}...
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={() => setPulseTarget(null)}
                                    sx={{ ml: 1 }}
                                >
                                    <X size={16} strokeWidth={1.5} />
                                </IconButton>
                            </Paper>
                        )}

                        {selectedFiles.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                                {selectedFiles.map((file, idx) => (
                                    <Box key={idx} sx={{ position: 'relative', width: 80, height: 80 }}>
                                        <Box 
                                            component="img" 
                                            src={URL.createObjectURL(file)} 
                                            sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }} 
                                        />
                                        <IconButton 
                                            size="small" 
                                            sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'rgba(0,0,0,0.6)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <X size={12} color="white" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </CardContent>
                    <Divider sx={{ opacity: 0.05 }} />
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                id="media-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            <label htmlFor="media-upload">
                                <IconButton 
                                    component="span" 
                                    sx={{ 
                                        borderRadius: '10px', 
                                        color: '#F59E0B', 
                                        '&:hover': { bgcolor: alpha('#F59E0B', 0.1) } 
                                    }}
                                >
                                    <ImageIcon size={20} strokeWidth={1.5} />
                                </IconButton>
                            </label>
                            <Button
                                startIcon={<FileText size={18} strokeWidth={1.5} />}
                                onClick={() => setIsNoteSelectorOpen(true)}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    minWidth: 0,
                                    px: 1.5,
                                    '&:hover': { color: 'primary.main', bgcolor: 'rgba(0, 240, 255, 0.05)' }
                                }}
                            >
                                Note
                            </Button>
                            <Button
                                startIcon={<Calendar size={18} strokeWidth={1.5} />}
                                onClick={() => setIsEventSelectorOpen(true)}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    minWidth: 0,
                                    px: 1.5,
                                    '&:hover': { color: 'primary.main', bgcolor: 'rgba(99, 102, 241, 0.05)' }
                                }}
                            >
                                Event
                            </Button>
                            <Button
                                startIcon={<Phone size={18} strokeWidth={1.5} />}
                                onClick={() => setIsCallSelectorOpen(true)}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    minWidth: 0,
                                    px: 1.5,
                                    '&:hover': { color: '#F59E0B', bgcolor: alpha('#F59E0B', 0.05) }
                                }}
                            >
                                Call
                            </Button>
                        </Box>
                        <Button
                            variant="contained"
                            disabled={(!newMoment.trim() && !selectedNote && !selectedEvent && !selectedCall && selectedFiles.length === 0) || posting}
                            onClick={handlePost}
                            sx={{
                                borderRadius: '12px',
                                px: 4,
                                fontWeight: 800,
                                textTransform: 'none',
                                bgcolor: '#F59E0B',
                                color: 'black',
                                '&:hover': { bgcolor: alpha('#F59E0B', 0.8) }
                            }}
                        >
                            {posting ? <CircularProgress size={20} color="inherit" /> : 'Post'}
                        </Button>
                    </CardActions>
                </Card>
            )}

            {/* Feed */}
            {moments.length === 0 && loading && <FeedSkeleton />}
            
            {moments.map((moment) => {
                const isOwnPost = user?.$id === (moment.userId || moment.creatorId);
                const creatorName = isOwnPost ? (user?.name || 'You') : (moment.creator?.displayName || moment.creator?.username || 'Unknown');
                const creatorAvatar = isOwnPost ? userAvatarUrl : (moment.creator?.avatar || undefined);
                const isUnknown = !isOwnPost && creatorName === 'Unknown';

                return (
                    <Card key={moment.$id} sx={{ 
                        mb: 3, 
                        borderRadius: '24px', 
                        bgcolor: '#161412', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        transition: 'all 0.2s ease', 
                        '&:hover': { bgcolor: '#1C1A18' } 
                    }} elevation={0}>
                        <CardHeader
                            avatar={
                                <Avatar
                                    src={creatorAvatar}
                                    sx={{ 
                                        bgcolor: isOwnPost ? '#F59E0B' : isUnknown ? '#1C1A18' : '#161412', 
                                        color: isOwnPost ? '#000' : isUnknown ? '#F59E0B' : 'text.secondary', 
                                        border: isUnknown ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                        fontWeight: (isOwnPost || isUnknown) ? 800 : 500,
                                        borderRadius: '10px'
                                    }}
                                >
                                    {creatorName.charAt(0).toUpperCase()}
                                </Avatar>
                            }
                            title={
                                <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: isOwnPost ? '#F59E0B' : isUnknown ? alpha('#F59E0B', 0.8) : 'text.primary' }}>
                                    {creatorName}
                                    {isOwnPost && (
                                        <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.5, fontWeight: 700, verticalAlign: 'middle' }}>
                                            (YOU)
                                        </Typography>
                                    )}
                                </Typography>
                            }
                            subheader={
                                <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 600 }}>
                                    {new Date(moment.$createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            }
                            action={
                                isOwnPost && (
                                    <IconButton 
                                        onClick={(e) => { 
                                            setPostMenuAnchorEl(e.currentTarget); 
                                            setMenuMoment(moment); 
                                        }}
                                        sx={{ color: 'rgba(255, 255, 255, 0.3)' }}
                                    >
                                        <MoreHorizontal size={20} />
                                    </IconButton>
                                )
                            }
                        />
                        <CardContent 
                            sx={{ pt: 0, px: 3, cursor: 'pointer' }}
                            onClick={() => router.push(`/post/${moment.$id}`)}
                        >
                        {/* Repost/Pulse Header */}
                        {moment.metadata?.type === 'pulse' && moment.sourceMoment && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#10B981', opacity: 0.8 }}>
                                <Repeat2 size={14} strokeWidth={3} />
                                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.05em' }}>
                                    {isOwnPost ? 'YOU PULSED' : `${creatorName.toUpperCase()} PULSED`}
                                </Typography>
                            </Box>
                        )}

                        {/* Comment Thread Context */}
                        {moment.metadata?.type === 'reply' && moment.sourceMoment && (
                            <Box sx={{ mb: 2, position: 'relative' }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1.5, 
                                    mb: 1, 
                                    opacity: 0.6,
                                    '&:hover': { opacity: 1 },
                                    cursor: 'pointer'
                                }} onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/post/${moment.sourceMoment.$id}`);
                                }}>
                                    <Avatar src={moment.sourceMoment.creator?.avatar} sx={{ width: 20, height: 20, borderRadius: '6px' }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        Replying to @{moment.sourceMoment.creator?.username || 'user'}
                                    </Typography>
                                </Box>
                                <Box sx={{ 
                                    position: 'absolute', 
                                    left: 9, 
                                    top: 22, 
                                    bottom: -10, 
                                    width: '2px', 
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '1px'
                                }} />
                                <Paper sx={{ 
                                    p: 1.5, 
                                    ml: 3,
                                    borderRadius: '12px', 
                                    bgcolor: 'rgba(255,255,255,0.02)', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    pointerEvents: 'none'
                                }}>
                                    <Typography variant="caption" sx={{ 
                                        opacity: 0.7, 
                                        display: '-webkit-box', 
                                        WebkitLineClamp: 2, 
                                        WebkitBoxOrient: 'vertical', 
                                        overflow: 'hidden',
                                        fontSize: '0.75rem',
                                        lineHeight: 1.4
                                    }}>
                                        {moment.sourceMoment.caption}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}

                        {moment.caption && moment.caption.trim() !== "" && (
                            <FormattedText 
                                text={moment.caption}
                                variant="body1"
                                sx={{ 
                                    lineHeight: 1.6, 
                                    fontSize: '1.05rem', 
                                    mb: (moment.attachedNote || (moment.sourceMoment && moment.metadata?.type !== 'reply') || moment.metadata?.attachments?.length) ? 2 : 0,
                                    mt: moment.metadata?.type === 'reply' ? 1 : 0 
                                }}
                            />
                        )}

                        {/* Media Grid */}
                        {moment.metadata?.attachments?.length > 0 && (
                            <Box sx={{ 
                                display: 'grid', 
                                gap: 1, 
                                gridTemplateColumns: moment.metadata.attachments.length === 1 ? '1fr' : '1fr 1fr',
                                mb: 2,
                                borderRadius: 4,
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {moment.metadata.attachments.map((att: any, i: number) => {
                                    if (att.type === 'image') {
                                        return (
                                            <Box 
                                                key={i} 
                                                component="img" 
                                                src={SocialService.getMediaPreview(att.id)} 
                                                sx={{ 
                                                    width: '100%', 
                                                    height: moment.metadata.attachments.length <= 2 ? 300 : 150, 
                                                    objectFit: 'cover' 
                                                }} 
                                            />
                                        );
                                    }
                                    return null;
                                })}
                            </Box>
                        )}

                        {/* Pulsed/Reposted Content */}
                        {moment.metadata?.type === 'pulse' && moment.sourceMoment && (
                            <Paper sx={{ 
                                p: 2, 
                                borderRadius: 4, 
                                bgcolor: 'rgba(255,255,255,0.01)', 
                                border: '1px solid rgba(255,255,255,0.05)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                            }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Avatar src={moment.sourceMoment.creator?.avatar} sx={{ width: 20, height: 20, borderRadius: '6px' }} />
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{moment.sourceMoment.creator?.displayName || moment.sourceMoment.creator?.username}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.4 }}>@{moment.sourceMoment.creator?.username}</Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {moment.sourceMoment.caption}
                                </Typography>
                            </Paper>
                        )}

                        {moment.metadata?.type === 'quote' && moment.sourceMoment && (
                            <Paper sx={{ 
                                p: 2, 
                                borderRadius: 4, 
                                bgcolor: 'rgba(255,255,255,0.01)', 
                                border: '1px solid rgba(255,255,255,0.05)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                            }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Avatar src={moment.sourceMoment.creator?.avatar} sx={{ width: 20, height: 20, borderRadius: '6px' }} />
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{moment.sourceMoment.creator?.displayName || moment.sourceMoment.creator?.username}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.4 }}>@{moment.sourceMoment.creator?.username}</Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {moment.sourceMoment.caption}
                                </Typography>
                            </Paper>
                        )}

                        {moment.attachedNote && (
                            <Paper
                                variant="outlined"
                                onClick={() => handleOpenNote(moment.attachedNote)}
                                sx={{
                                    p: 0,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                                    borderColor: 'rgba(255, 255, 255, 0.08)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        borderColor: 'rgba(99, 102, 241, 0.4)',
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.1)'
                                    }
                                }}
                            >
                                <Box sx={{
                                    p: 3,
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(0, 163, 255, 0.02) 100%)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 1.5,
                                                bgcolor: 'rgba(99, 102, 241, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mr: 2,
                                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                                            }}
                                        >
                                            <FileText size={20} color="#6366F1" strokeWidth={1.5} />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={900}
                                                sx={{
                                                    color: 'white',
                                                    fontFamily: 'var(--font-space-grotesk)',
                                                    letterSpacing: '-0.01em',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                {moment.attachedNote.title || 'Untitled Note'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                                                Public Note • {new Date(moment.attachedNote.updatedAt || moment.attachedNote.$updatedAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            lineHeight: 1.7,
                                            fontSize: '0.925rem',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 4,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            fontFamily: 'var(--font-inter)'
                                        }}
                                    >
                                        {moment.attachedNote.content?.replace(/[#*`]/g, '')}
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    px: 3,
                                    py: 1.5,
                                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                        Shared via Kylrix Note
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {moment.attachedNote.tags?.slice(0, 2).map((_tag: string, i: number) => (
                                            <Box key={i} sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(255, 255, 255, 0.05)', fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700 }}>
                                                #{_tag}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </Paper>
                        )}

                        {moment.attachedEvent && (
                            <Paper
                                variant="outlined"
                                onClick={() => handleOpenEvent(moment.attachedEvent)}
                                sx={{
                                    p: 0,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                                    borderColor: 'rgba(255, 255, 255, 0.08)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        borderColor: 'rgba(0, 163, 255, 0.4)',
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 163, 255, 0.1)'
                                    }
                                }}
                            >
                                <Box sx={{
                                    p: 3,
                                    background: 'linear-gradient(135deg, rgba(0, 163, 255, 0.05) 0%, rgba(0, 120, 255, 0.02) 100%)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 1.5,
                                                bgcolor: 'rgba(0, 163, 255, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mr: 2,
                                                boxShadow: '0 4px 12px rgba(0, 163, 255, 0.15)'
                                            }}
                                        >
                                            <Calendar size={20} color="#00A3FF" strokeWidth={1.5} />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={900}
                                                sx={{
                                                    color: 'white',
                                                    fontFamily: 'var(--font-space-grotesk)',
                                                    letterSpacing: '-0.01em',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                {moment.attachedEvent.title || 'Untitled Event'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                                                Kylrix Flow Event • {new Date(moment.attachedEvent.startTime).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'rgba(255, 255, 255, 0.6)' }}>
                                            <Clock size={14} strokeWidth={1.5} />
                                            <Typography variant="caption" fontWeight={600}>
                                                {new Date(moment.attachedEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(moment.attachedEvent.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                        {moment.attachedEvent.location && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'rgba(255, 255, 255, 0.6)' }}>
                                                <MapPin size={14} strokeWidth={1.5} />
                                                <Typography variant="caption" fontWeight={600}>
                                                    {moment.attachedEvent.location}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                                <Box sx={{
                                    px: 3,
                                    py: 1.5,
                                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <Typography variant="caption" sx={{ color: '#00A3FF', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                        Scheduled via Kylrixflow
                                    </Typography>
                                    <Button size="small" variant="text" sx={{ color: '#00A3FF', fontWeight: 800, fontSize: '0.65rem' }}>
                                        View Details
                                    </Button>
                                </Box>
                            </Paper>
                        )}

                        {moment.attachedCall && (
                            <Paper
                                variant="outlined"
                                onClick={() => router.push(`/call/${moment.attachedCall.$id}`)}
                                sx={{
                                    p: 0,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                                    borderColor: 'rgba(255, 255, 255, 0.08)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        borderColor: 'rgba(245, 158, 11, 0.4)',
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.1)'
                                    }
                                }}
                            >
                                <Box sx={{
                                    p: 3,
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.02) 100%)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 1.5,
                                                bgcolor: 'rgba(245, 158, 11, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mr: 2,
                                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
                                            }}
                                        >
                                            {moment.attachedCall.type === 'video' ? <Video size={20} color="#F59E0B" strokeWidth={1.5} /> : <Phone size={20} color="#F59E0B" strokeWidth={1.5} />}
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={900}
                                                sx={{
                                                    color: 'white',
                                                    fontFamily: 'var(--font-space-grotesk)',
                                                    letterSpacing: '-0.01em',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                {moment.attachedCall.title || `${moment.attachedCall.type.charAt(0).toUpperCase() + moment.attachedCall.type.slice(1)} Call`}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                                                Kylrix Connect Call • {new Date(moment.attachedCall.startsAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'rgba(255, 255, 255, 0.6)' }}>
                                            <Clock size={14} strokeWidth={1.5} />
                                            <Typography variant="caption" fontWeight={600}>
                                                Starts: {new Date(moment.attachedCall.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                                <Box sx={{
                                    px: 3,
                                    py: 1.5,
                                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                        Hosted via Kylrix Connect
                                    </Typography>
                                    <Button size="small" variant="text" sx={{ color: '#F59E0B', fontWeight: 800, fontSize: '0.65rem' }}>
                                        Join Call
                                    </Button>
                                </Box>
                            </Paper>
                        ) }
                    </CardContent>
                        <CardActions sx={{ px: 2, pb: 1, pt: 0, justifyContent: 'space-around', color: 'rgba(255, 255, 255, 0.4)' }}>
                        <Tooltip title="Reply">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton 
                                    size="small"
                                    sx={{ 
                                        p: 1,
                                        '&:hover': { color: '#6366F1', bgcolor: alpha('#6366F1', 0.1) } 
                                    }}
                                >
                                    <MessageCircle size={19} strokeWidth={1.5} />
                                </IconButton>
                                <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.5 }}>{moment.stats?.replies || 0}</Typography>
                            </Box>
                        </Tooltip>

                        <Tooltip title="Pulse or Quote">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton 
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPulseMenuAnchorEl(e.currentTarget);
                                        setMenuMoment(moment);
                                    }}
                                    sx={{ 
                                        p: 1,
                                        color: moments.some(m => m.metadata?.type === 'pulse' && m.metadata?.sourceId === moment.$id && (m.userId === user?.$id || m.creatorId === user?.$id)) ? '#10B981' : 'inherit',
                                        '&:hover': { color: '#10B981', bgcolor: alpha('#10B981', 0.1) } 
                                    }}
                                >
                                    <Repeat2 size={19} strokeWidth={1.5} />
                                </IconButton>
                                <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.5 }}>{moment.stats?.pulses || 0}</Typography>
                            </Box>
                        </Tooltip>

                        <Tooltip title="Heart">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton 
                                    size="small"
                                    onClick={(e) => handleToggleLike(e, moment)}
                                    sx={{ 
                                        p: 1,
                                        color: moment.isLiked ? '#F59E0B' : 'inherit',
                                        '&:hover': { color: '#F59E0B', bgcolor: alpha('#F59E0B', 0.1) } 
                                    }}
                                >
                                    <Heart size={19} fill={moment.isLiked ? '#F59E0B' : 'none'} strokeWidth={1.5} />
                                </IconButton>
                                <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.5 }}>{moment.stats?.likes || 0}</Typography>
                            </Box>
                        </Tooltip>

                        <Tooltip title="Bookmark">
                            <IconButton 
                                size="small"
                                sx={{ 
                                    p: 1,
                                    '&:hover': { color: '#EC4899', bgcolor: alpha('#EC4899', 0.1) } 
                                }}
                            >
                                <Bookmark size={19} strokeWidth={1.5} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Share">
                            <IconButton
                                size="small"
                                onClick={(e) => { 
                                    e.stopPropagation();
                                    setShareAnchorEl(e.currentTarget); 
                                    setSelectedMoment(moment); 
                                }}
                                sx={{ 
                                    p: 1,
                                    '&:hover': { color: '#6366F1', bgcolor: alpha('#6366F1', 0.1) } 
                                }}
                            >
                                <Share size={19} strokeWidth={1.5} />
                            </IconButton>
                        </Tooltip>
                    </CardActions>
                </Card>
                );
            })}

            <Menu
                anchorEl={postMenuAnchorEl}
                open={Boolean(postMenuAnchorEl)}
                onClose={() => setPostMenuAnchorEl(null)}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: '16px',
                        bgcolor: 'rgba(15, 15, 15, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        minWidth: 160
                    }
                }}
            >
                <MenuItem sx={{ gap: 1.5, py: 1.2, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Edit size={16} strokeWidth={2} style={{ opacity: 0.7 }} /> Edit Moment
                </MenuItem>
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
                <MenuItem 
                    onClick={() => menuMoment && handleDeletePost(menuMoment.$id)}
                    sx={{ gap: 1.5, py: 1.2, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ff4d4d' }}
                >
                    <Trash2 size={16} strokeWidth={2} /> Delete Moment
                </MenuItem>
            </Menu>

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
                    onClick={() => menuMoment && handlePulse(menuMoment)}
                    sx={{ gap: 1.5, py: 1.2, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10B981' }}
                >
                    <Repeat2 size={18} strokeWidth={2} /> {moments.some(m => m.metadata?.type === 'pulse' && m.metadata?.sourceId === menuMoment?.$id && (m.userId === user?.$id || m.creatorId === user?.$id)) ? 'Unpulse Moment' : 'Pulse Now'}
                </MenuItem>
                <MenuItem 
                    onClick={() => menuMoment && handleQuote(menuMoment)}
                    sx={{ gap: 1.5, py: 1.2, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                    <Edit size={18} strokeWidth={2} style={{ opacity: 0.7 }} /> Quote Moment
                </MenuItem>
            </Menu>

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
                    <Bookmark size={20} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Save to Messages
                </MenuItem>
                <MenuItem onClick={() => handleForwardToChat(selectedMoment)} sx={{ gap: 1.5, py: 1.2, fontWeight: 600 }}>
                    <Send size={20} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Forward to Chat
                </MenuItem>
            </Menu>

            {/* Mobile FAB */}
            {isMobile && user && (
                <Fab 
                    color="primary" 
                    sx={{ 
                        position: 'fixed', 
                        bottom: 80, 
                        right: 20, 
                        bgcolor: '#F59E0B', 
                        color: 'black',
                        '&:hover': { bgcolor: alpha('#F59E0B', 0.8) }
                    }}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <Plus size={24} />
                </Fab>
            )}

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

            <EventSelectorModal
                open={isEventModalOpen}
                onClose={() => setIsEventSelectorOpen(false)}
                onSelect={(event) => setSelectedEvent(event)}
            />

            <CallSelectorModal
                open={isCallModalOpen}
                onClose={() => setIsCallSelectorOpen(false)}
                onSelect={(call) => setSelectedCall(call)}
            />

            <EventViewDrawer
                open={isEventDrawerOpen}
                onClose={() => setIsEventDrawerOpen(false)}
                event={viewingEvent}
            />

            {isMobile && user && (
                <Fab 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    sx={{ 
                        position: 'fixed', 
                        bottom: 100, 
                        right: 24, 
                        bgcolor: '#F59E0B', 
                        color: '#000',
                        '&:hover': { bgcolor: alpha('#F59E0B', 0.8) },
                        zIndex: 1001
                    }}
                >
                    <Plus />
                </Fab>
            )}
        </Box>
    );
};
