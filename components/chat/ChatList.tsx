'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChatService } from '@/lib/services/chat';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UsersService } from '@/lib/services/users';
import { KeychainService } from '@/lib/appwrite/keychain';
import { tablesDB } from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import {
    List,
    ListItem,
    ListItemButton,
    Avatar,
    ListItemText,
    Typography,
    Box,
    CircularProgress,
    Skeleton,
    alpha,
    Badge,
    ListItemAvatar,
    Divider,
    Stack,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/GroupWorkOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import BookmarkIcon from '@mui/icons-material/BookmarkOutlined';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/LockOutlined';
import { fetchProfilePreview } from '@/lib/profile-preview';
import { seedIdentityCache } from '@/lib/identity-cache';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { realtime } from '@/lib/appwrite/client';
import toast from 'react-hot-toast';
import { useSudo } from '@/context/SudoContext';

const GlobalSearchAvatar = ({ u }: { u: any }) => {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (u.avatar) {
            if (String(u.avatar).startsWith('http')) {
                setAvatarUrl(u.avatar);
            } else {
                fetchProfilePreview(u.avatar, 64, 64).then(url => setAvatarUrl(url as unknown as string)).catch(() => {});
            }
        }
    }, [u.avatar]);

    return (
        <Avatar
            src={avatarUrl || undefined}
            sx={{
                bgcolor: alpha('#F59E0B', 0.1),
                color: '#F59E0B',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                width: 44,
                height: 44
            }}
        >
            {!avatarUrl && (u.displayName || u.username || '?').charAt(0).toUpperCase()}
        </Avatar>
    );
};

export const ChatList = () => {
    const { user } = useAuth();
    const router = useRouter();
    const { requestSudo } = useSudo();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(ecosystemSecurity.status.isUnlocked);

    const isLikelyEncrypted = (val: string) => {
        if (!val) return false;
        return val.length > 40 && !val.includes(' ');
    };

    const handleGlobalSearch = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await UsersService.searchUsers(query);
            // Hide current user from results
            const filtered = res.rows.filter((u: any) => (u.userId || u.$id) !== user?.$id);
            setSearchResults(filtered);
        } catch (error) {
            console.error('Global search failed:', error);
        } finally {
            setSearching(false);
        }
    }, [user?.$id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                handleGlobalSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, handleGlobalSearch]);

    const startChat = async (targetUser: any) => {
        if (!user) return;
        const targetUserId = targetUser.userId || targetUser.$id;

        if (!targetUser.publicKey) {
            toast.error(`${targetUser.displayName || targetUser.username} hasn't set up their account for secure chatting yet.`);
            return;
        }

        // Check for existing conversation locally
        const found = conversations.find((c: any) =>
            c.type === 'direct' && c.participants?.includes(targetUserId)
        );

        if (found) {
            router.push(`/chat/${found.$id}`);
            return;
        }

        // If not found, ensure Sudo is unlocked before creating
        requestSudo({
            onSuccess: async () => {
                try {
                    const participants = [user.$id, targetUserId];
                    const newConv = await ChatService.createConversation(participants, 'direct');
                    router.push(`/chat/${newConv.$id}`);
                } catch (error: any) {
                    console.error('Failed to create chat:', error);
                    toast.error(`Failed to create chat: ${error?.message || 'Unknown error'}`);
                }
            }
        });
    };

    const loadConversations = React.useCallback(async () => {
        try {
            console.log('[ChatList] Loading conversations for user:', user!.$id);
            const response = await ChatService.getConversations(user!.$id);
            let rows = [...response.rows];

            // Check if we need to prompt for unlock
            const hasEncrypted = rows.some(c => c.isEncrypted);
            if (hasEncrypted && !ecosystemSecurity.status.isUnlocked) return;

            console.log('[ChatList] Fetched rows count:', rows.length);

            // Bridge: Detect and deduplicate self-chats, then ensure one exists
            const isSelfChat = (c: any) =>
                c.type === 'direct' &&
                c.participants && (c.participants.length === 1 || c.participants.length === 2) &&
                c.participants.every((p: string) => p === user!.$id);

            const allSelfChats = rows.filter(isSelfChat);
            console.log('[ChatList] Self chats found:', allSelfChats.length);

            // Dedup: If more than one self-chat exists, keep the best one and delete the rest
            if (allSelfChats.length > 1) {
                console.log('[ChatList] Duplicate self-chats detected, deduplicating...');
                // Sort: prefer the one with most recent activity, fallback to newest created
                allSelfChats.sort((a, b) => {
                    const timeA = new Date(a.lastMessageAt || a.$createdAt || 0).getTime();
                    const timeB = new Date(b.lastMessageAt || b.$createdAt || 0).getTime();
                    return timeB - timeA;
                });

                const keeper = allSelfChats[0];
                const extras = allSelfChats.slice(1);

                console.log('[ChatList] Keeping self-chat:', keeper.$id);

                // Delete duplicates in background
                for (const dup of extras) {
                    console.log('[ChatList] Removing duplicate self-chat:', dup.$id);
                    ChatService.nuclearWipe(dup.$id)
                        .then(() => tablesDB.deleteRow(APPWRITE_CONFIG.DATABASES.CHAT, APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS, dup.$id))
                        .catch(err => console.warn('[ChatList] Failed to remove duplicate self-chat', dup.$id, err));
                }

                // Remove extras from rows
                const extraIds = new Set(extras.map((e: any) => e.$id));
                rows = rows.filter(r => !extraIds.has(r.$id));
            }

            const selfChat = rows.find(isSelfChat);

            if (!selfChat) {
                const hasTier2 = await KeychainService.hasMasterpass(user!.$id);
                console.log('[ChatList] Self chat not found, auto-initializing... hasTier2:', hasTier2);
                try {
                    // If they have Tier 2 but are locked, we wait (to ensure it's created as E2E)
                    if (hasTier2 && !ecosystemSecurity.status.isUnlocked) {
                        console.log('[ChatList] Vault is locked. Self chat auto-creation deferred until unlock.');
                        setLoading(false);
                        return;
                    }

                    // CRITICAL: Ensure E2E identity is ready before creating conversation.
                    if (ecosystemSecurity.status.isUnlocked) {
                        console.log('[ChatList] Ensuring E2E identity before self-chat creation...');
                        await ecosystemSecurity.ensureE2EIdentity(user!.$id);
                    }

                    const newSelfChat = await ChatService.createConversation([user!.$id], 'direct');
                    console.log('[ChatList] Self chat created:', newSelfChat.$id);
                    rows = [newSelfChat, ...rows];
                } catch (e: unknown) {
                    console.error('[ChatList] Failed to auto-create self chat', e);
                }
            }

            // Enrich with other participant's name and avatar
            const enriched = await Promise.all(rows.map(async (conv: any) => {
                if (conv.type === 'direct') {
                    const isActuallySelf = conv.participants && (conv.participants.length === 1 || conv.participants.length === 2) && conv.participants.every((p: string) => p === user!.$id);

                    if (!isActuallySelf) {
                        const otherId = conv.participants.find((p: string) => p !== user!.$id);
                        if (otherId) {
                            try {
                                const profile = await UsersService.getProfileById(otherId);
                                let avatarUrl = null;
                                if (profile?.avatar?.startsWith?.('http')) {
                                    avatarUrl = profile.avatar;
                                } else if (profile?.avatar) {
                                    try {
                                        const url = await fetchProfilePreview(profile.avatar, 64, 64);
                                        avatarUrl = url as unknown as string;
                                    } catch (_e) {}
                                }
                                seedIdentityCache({ ...profile, avatar: profile?.avatar || avatarUrl });
                                return {
                                    ...conv,
                                    otherUserId: otherId,
                                    name: profile ? (profile.displayName || profile.username) : `@${otherId.slice(0, 7)}`,
                                    avatarUrl
                                };
                            } catch (_e: unknown) {
                                return { ...conv, name: `@${otherId.slice(0, 7)}` };
                            }
                        }
                    } else {
                        // Self Chat
                        const myProfile = await UsersService.getProfileById(user!.$id);
                        const myName = myProfile ? (myProfile.displayName || myProfile.username) : (user!.name || 'You');
                        let avatarUrl = null;
                        if (myProfile?.avatar?.startsWith?.('http')) {
                            avatarUrl = myProfile.avatar;
                        } else if (myProfile?.avatar) {
                            try {
                                const url = await fetchProfilePreview(myProfile.avatar, 64, 64);
                                avatarUrl = url as unknown as string;
                            } catch (_e) {}
                        }
                        seedIdentityCache({ ...myProfile, avatar: myProfile?.avatar || avatarUrl });
                        return {
                            ...conv,
                            otherUserId: user!.$id,
                            name: `${myName} (You)`,
                            isSelf: true,
                            avatarUrl
                        };
                    }
                }
                return { ...conv, name: conv.name || 'Group Chat' };
            }));

            console.log('[ChatList] Enriched conversations count:', enriched.length);

            // Sort: Self chat always on top if no recent activity, otherwise standard sort
            const sorted = enriched.sort((a, b) => {
                if (a.isSelf && !a.lastMessageAt) return -1;
                if (b.isSelf && !b.lastMessageAt) return 1;
                const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
                const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
                return timeB - timeA;
            });

            console.log('[ChatList] Final sorted list count:', sorted.length);
            setConversations(sorted);
        } catch (error: unknown) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        const checkUnlock = setInterval(() => {
            if (ecosystemSecurity.status.isUnlocked !== isUnlocked) {
                const newStatus = ecosystemSecurity.status.isUnlocked;
                setIsUnlocked(newStatus);
                if (newStatus) {
                    loadConversations();
                }
            }
        }, 1000);
        return () => clearInterval(checkUnlock);
    }, [isUnlocked, loadConversations]);

    useEffect(() => {
        if (!user) return;

        loadConversations();

        const conversationChannel = `databases.${APPWRITE_CONFIG.DATABASES.CHAT}.tables.${APPWRITE_CONFIG.TABLES.CHAT.CONVERSATIONS}.rows`;
        const messageChannel = `databases.${APPWRITE_CONFIG.DATABASES.CHAT}.tables.${APPWRITE_CONFIG.TABLES.CHAT.MESSAGES}.rows`;

        const subscription: any = realtime.subscribe([conversationChannel, messageChannel], async (response) => {
            const payload = response.payload as any;
            const isConversationEvent = Array.isArray(payload?.participants);
            const relatedConversationId = isConversationEvent ? payload?.$id : payload?.conversationId;

            if (!relatedConversationId) return;

            try {
                const conversation = await ChatService.getConversationById(relatedConversationId, user.$id);
                if (!conversation?.participants?.includes(user.$id)) return;

                console.log('[ChatList] Real-time update for conversation:', relatedConversationId);
                loadConversations();
            } catch (_e) {
                if (isConversationEvent && response.events.some(e => e.includes('.delete'))) {
                    setConversations(prev => prev.filter(c => c.$id !== relatedConversationId));
                }
            }
        });

        return () => {
            if (typeof subscription === 'function') subscription();
            else if (subscription?.unsubscribe) subscription.unsubscribe();
        };
    }, [user, loadConversations]);

    if (loading) return (
        <Box sx={{ p: 2 }}>
            <Stack spacing={1.5}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
                        <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.05)' }} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton width="55%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                            <Skeleton width="35%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                        </Box>
                    </Box>
                ))}
            </Stack>
        </Box>
    );

    const filteredConversations = conversations.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasNoConversations = filteredConversations.length === 0;
    const showGlobalResults = searchQuery.length >= 2 && searchResults.length > 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0A0908', position: 'relative' }}>
            <Box sx={{ p: 3, pb: 2 }}>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 900,
                        fontFamily: 'var(--font-clash)',
                        letterSpacing: '-0.02em',
                        mb: 2,
                        color: 'text.primary'
                    }}
                >
                    Messages
                </Typography>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: '#161412',
                        borderRadius: '12px',
                        px: 2,
                        py: 1,
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '1px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px'
                        },
                        '&:focus-within': {
                            borderColor: '#6366F1',
                            bgcolor: '#1C1A18'
                        }
                    }}
                >
                    <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    <input
                        placeholder="Search conversations or people..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.875rem',
                            outline: 'none',
                            width: '100%',
                            fontFamily: 'var(--font-satoshi)'
                        }}
                    />
                    {searching && <CircularProgress size={14} sx={{ color: 'primary.main' }} />}
                </Box>
            </Box>

            <Box sx={{
                overflowY: 'auto',
                flex: 1,
                px: 1
            }}>
                {showGlobalResults && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ px: 2, mb: 1, display: 'block', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Global Search
                        </Typography>
                        <List sx={{ pt: 0 }}>
                            {searchResults.map((u) => {
                                const targetId = u.userId || u.$id;
                                const hasChat = conversations.some(c => c.type === 'direct' && c.participants?.includes(targetId));
                                return (
                                    <ListItem key={u.$id} disablePadding sx={{ mb: 0.5 }}>
                                        <ListItemButton
                                            onClick={() => startChat(u)}
                                            sx={{
                                                borderRadius: '12px',
                                                py: 1,
                                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' }
                                            }}
                                        >
                                            <ListItemAvatar sx={{ minWidth: 56 }}>
                                                <GlobalSearchAvatar u={u} />
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={u.displayName || u.username}
                                                secondary={`@${u.username}`}
                                                primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                                                secondaryTypographyProps={{ fontSize: '0.75rem', sx: { opacity: 0.5 } }}
                                            />
                                            {!hasChat && (
                                                <Box sx={{ 
                                                    px: 1, 
                                                    py: 0.2, 
                                                    borderRadius: '4px', 
                                                    bgcolor: alpha('#6366F1', 0.1), 
                                                    border: '1px solid rgba(99, 102, 241, 0.2)' 
                                                }}>
                                                    <Typography sx={{ fontSize: '9px', fontWeight: 900, color: '#6366F1' }}>NEW</Typography>
                                                </Box>
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                        <Divider sx={{ mx: 2, my: 1, opacity: 0.05 }} />
                    </Box>
                )}

                {hasNoConversations && !showGlobalResults ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>No conversations</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>Search for people to start a chat</Typography>
                    </Box>
                ) : (
                    <List sx={{ pt: 0 }}>
                        {filteredConversations.map((conv) => (
                            <ListItem key={conv.$id} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    component={Link}
                                    href={`/chat/${conv.$id}`}
                                    sx={{
                                        borderRadius: '12px',
                                        py: 1.5,
                                        '&:hover': {
                                            bgcolor: 'rgba(255, 255, 255, 0.03)'
                                        }
                                    }}
                                >
                                        <Avatar
                                            src={conv.avatarUrl}
                                            sx={{
                                            bgcolor: conv.isSelf ? alpha('#6366F1', 0.1) : alpha('#F59E0B', 0.1),
                                            color: conv.isSelf ? '#6366F1' : '#F59E0B',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                                            width: 44,
                                            height: 44
                                        }}
                                    >
                                        {conv.isSelf ? <BookmarkIcon sx={{ fontSize: 20 }} /> : (conv.type === 'group' ? <GroupIcon sx={{ fontSize: 22 }} /> : (conv.name?.replace(/^@/, '').charAt(0).toUpperCase() || <PersonIcon sx={{ fontSize: 22, color: '#F59E0B' }} />))}
                                    </Avatar>
                                    <ListItemText
                                        primary={conv.name || (conv.type === 'direct' ? conv.otherUserId : 'Group Chat')}
                                        secondary={
                                            (conv.isEncrypted && !isUnlocked && isLikelyEncrypted(conv.lastMessageText)) ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <LockIcon sx={{ fontSize: 12, opacity: 0.5 }} />
                                                    <span>Encrypted message</span>
                                                </Box>
                                            ) : (conv.lastMessageText || 'No messages yet')
                                        }
                                        primaryTypographyProps={{
                                            fontWeight: 700,
                                            fontSize: '0.95rem',
                                            color: conv.isSelf ? '#6366F1' : 'text.primary',
                                            fontFamily: 'var(--font-clash)'
                                        }}
                                        secondaryTypographyProps={{
                                            noWrap: true,
                                            fontSize: '0.75rem',
                                            sx: { opacity: 0.5, mt: 0.3 }
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                                        {conv.lastMessageAt && (
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 600 }}>
                                                {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </Typography>
                                        )}
                                        {/* Unread Bubble placeholder - visible if last message is not from us and not read */}
                                        {conv.lastMessageAt && conv.lastMessageId && !conv.isSelf && (
                                            <Badge 
                                                variant="dot" 
                                                color="primary" 
                                                sx={{ 
                                                    '& .MuiBadge-badge': { 
                                                        bgcolor: '#6366F1',
                                                        boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)'
                                                    } 
                                                }} 
                                            />
                                        )}
                                    </Box>
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

        </Box>
    );
};
