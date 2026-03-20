'use client';

import React, { useEffect, useState } from 'react';
import { ChatService } from '@/lib/services/chat';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
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
    alpha,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/GroupWorkOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import BookmarkIcon from '@mui/icons-material/BookmarkOutlined';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/LockOutlined';
import { fetchProfilePreview } from '@/lib/profile-preview';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { SudoModal } from '../overlays/SudoModal';
import { realtime } from '@/lib/appwrite/client';

export const ChatList = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(ecosystemSecurity.status.isUnlocked);
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);

    const loadConversations = React.useCallback(async () => {
        try {
            console.log('[ChatList] Loading conversations for user:', user!.$id);
            const response = await ChatService.getConversations(user!.$id);
            let rows = [...response.rows];

            // Check if we need to prompt for unlock
            const hasEncrypted = rows.some(c => c.isEncrypted);
            if (hasEncrypted && !ecosystemSecurity.status.isUnlocked) {
                setUnlockModalOpen(true);
            }

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
                        setUnlockModalOpen(true);
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
                                if (profile?.avatar) {
                                    try {
                                        const url = await fetchProfilePreview(profile.avatar, 64, 64);
                                        avatarUrl = url as unknown as string;
                                    } catch (_e) {}
                                }
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
                        if (myProfile?.avatar) {
                            try {
                                const url = await fetchProfilePreview(myProfile.avatar, 64, 64);
                                avatarUrl = url as unknown as string;
                            } catch (_e) {}
                        }
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

    if (loading) return <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} sx={{ color: 'primary.main' }} /></Box>;

    const filteredConversations = conversations.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        placeholder="Search conversations..."
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
                </Box>
            </Box>

            <Box sx={{
                overflowY: 'auto',
                flex: 1,
                px: 1
            }}>
                {filteredConversations.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>No conversations</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>Start a new chat to begin</Typography>
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
                                                bgcolor: conv.isSelf ? alpha('#6366F1', 0.1) : '#161412',
                                                color: conv.isSelf ? '#6366F1' : 'text.secondary',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                                                width: 44,
                                                height: 44
                                            }}
                                        >
                                            {conv.isSelf ? <BookmarkIcon sx={{ fontSize: 20 }} /> : (conv.type === 'group' ? <GroupIcon sx={{ fontSize: 22 }} /> : (conv.name?.replace(/^@/, '').charAt(0).toUpperCase() || <PersonIcon sx={{ fontSize: 22 }} />))}
                                        </Avatar>
                                    <ListItemText
                                        primary={conv.name || (conv.type === 'direct' ? conv.otherUserId : 'Group Chat')}
                                        secondary={
                                            (conv.isEncrypted && !isUnlocked && conv.lastMessageText) ? (
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
                                    {conv.lastMessageAt && (
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 600 }}>
                                            {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </Typography>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            <SudoModal
                isOpen={unlockModalOpen}
                onCancel={() => setUnlockModalOpen(false)}
                onSuccess={() => {
                    setUnlockModalOpen(false);
                    setIsUnlocked(true);
                    loadConversations();
                }}
            />
        </Box>
    );
};
