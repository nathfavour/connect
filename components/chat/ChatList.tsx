'use client';

import React, { useEffect, useState } from 'react';
import { ChatService } from '@/lib/services/chat';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { UsersService } from '@/lib/services/users';
import { 
    List, 
    ListItem, 
    ListItemButton, 
    ListItemAvatar, 
    Avatar, 
    ListItemText, 
    Typography, 
    Box,
    CircularProgress,
    Divider,
    Button,
    alpha
} from '@mui/material';
import GroupIcon from '@mui/icons-material/GroupWorkOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import BookmarkIcon from '@mui/icons-material/BookmarkOutlined';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/LockOutlined';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { MasterPassModal } from './MasterPassModal';

export const ChatList = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(ecosystemSecurity.status.isUnlocked);
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);

    useEffect(() => {
        const checkUnlock = setInterval(() => {
            if (ecosystemSecurity.status.isUnlocked !== isUnlocked) {
                setIsUnlocked(ecosystemSecurity.status.isUnlocked);
                if (ecosystemSecurity.status.isUnlocked) {
                    loadConversations();
                }
            }
        }, 1000);
        return () => clearInterval(checkUnlock);
    }, [isUnlocked]);

    useEffect(() => {
        if (user && isUnlocked) {
            loadConversations();
        } else if (!isUnlocked) {
            setLoading(false);
        }
    }, [user, isUnlocked]);

    const loadConversations = async () => {
        try {
            console.log('[ChatList] Loading conversations for user:', user!.$id);
            const response = await ChatService.getConversations(user!.$id);
            let rows = [...response.rows];
            console.log('[ChatList] Fetched rows count:', rows.length);

            // Bridge: Ensure self-chat (Saved Messages) exists
            const selfChat = rows.find(c => 
                c.type === 'direct' && 
                c.participants && c.participants.length > 0 &&
                c.participants.every((p: string) => p === user!.$id)
            );
            
            console.log('[ChatList] Self chat found:', !!selfChat);

            if (!selfChat) {
                console.log('[ChatList] Self chat not found, creating one...');
                try {
                    const newSelfChat = await ChatService.createConversation([user!.$id], 'direct');
                    console.log('[ChatList] Self chat created:', newSelfChat.$id);
                    rows = [newSelfChat, ...rows];
                } catch (_e: unknown) {
                    console.error('[ChatList] Failed to auto-create self chat', e);
                }
            }

            // Enrich with other participant's name
            const enriched = await Promise.all(rows.map(async (conv: any) => {
                if (conv.type === 'direct') {
                    const isActuallySelf = conv.participants && conv.participants.length > 0 && conv.participants.every((p: string) => p === user!.$id);
                    
                    if (!isActuallySelf) {
                        const otherId = conv.participants.find((p: string) => p !== user!.$id);
                        if (otherId) {
                            try {
                                const profile = await UsersService.getProfileById(otherId);
                                return { 
                                    ...conv, 
                                    otherUserId: otherId, 
                                    name: profile ? (profile.displayName || profile.username) : ('User ' + otherId.substring(0, 5)) 
                                };
                            } catch (_e: unknown) {
                                return { ...conv, name: 'User ' + otherId.substring(0, 5) };
                            }
                        }
                    } else {
                        // Self Chat
                        return {
                            ...conv,
                            otherUserId: user!.$id,
                            name: 'Saved Messages',
                            isSelf: true
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
        } catch (_error: unknown) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} sx={{ color: 'primary.main' }} /></Box>;

    const filteredConversations = conversations.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default', position: 'relative' }}>
            <Box sx={{ p: 3, pb: 2, filter: !isUnlocked ? 'blur(8px)' : 'none', pointerEvents: !isUnlocked ? 'none' : 'auto' }}>
                <Typography 
                    variant="h5" 
                    sx={{ 
                        fontWeight: 900, 
                        fontFamily: 'var(--font-space-grotesk)',
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
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        px: 2,
                        py: 1,
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        '&:focus-within': {
                            borderColor: 'primary.main',
                            bgcolor: 'rgba(255, 255, 255, 0.05)'
                        }
                    }}
                >
                    <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    <input 
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(_e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.875rem',
                            outline: 'none',
                            width: '100%',
                            fontFamily: 'var(--font-inter)'
                        }}
                    />
                </Box>
            </Box>

            <Box sx={{ 
                overflowY: 'auto', 
                flex: 1, 
                px: 1, 
                filter: !isUnlocked ? 'blur(12px)' : 'none',
                pointerEvents: !isUnlocked ? 'none' : 'auto'
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
                                    <ListItemAvatar>
                                        <Avatar 
                                            sx={{ 
                                                bgcolor: conv.isSelf ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                                color: conv.isSelf ? 'primary.main' : 'text.secondary',
                                                border: conv.isSelf ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                width: 44,
                                                height: 44
                                            }}
                                        >
                                            {conv.isSelf ? <BookmarkIcon sx={{ fontSize: 20 }} /> : (conv.type === 'group' ? <GroupIcon sx={{ fontSize: 22 }} /> : <PersonIcon sx={{ fontSize: 22 }} />)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText 
                                        primary={conv.name || (conv.type === 'direct' ? conv.otherUserId : 'Group Chat')}
                                        secondary={conv.lastMessageText || 'No messages yet'}
                                        primaryTypographyProps={{ 
                                            fontWeight: 700, 
                                            fontSize: '0.95rem',
                                            color: conv.isSelf ? 'primary.main' : 'text.primary',
                                            fontFamily: 'var(--font-space-grotesk)'
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

            {!isUnlocked && (
                <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    zIndex: 10,
                    p: 3,
                    textAlign: 'center',
                    bgcolor: 'rgba(0,0,0,0.2)'
                }}>
                    <Box sx={{ 
                        p: 2, 
                        borderRadius: '20px', 
                        bgcolor: 'rgba(15, 15, 15, 0.8)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}>
                        <LockIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Chats Locked</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 240 }}>
                            Unlock your ecosystem vault to access your end-to-end encrypted conversations.
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={() => setUnlockModalOpen(true)}
                            sx={{ 
                                borderRadius: '12px', 
                                px: 4, 
                                py: 1.2, 
                                fontWeight: 800,
                                bgcolor: 'primary.main',
                                color: 'black',
                                '&:hover': { bgcolor: alpha('#00F0FF', 0.8) }
                            }}
                        >
                            Unlock Vault
                        </Button>
                    </Box>
                </Box>
            )}

            <MasterPassModal 
                open={unlockModalOpen} 
                onClose={() => setUnlockModalOpen(false)} 
                onSuccess={() => {
                    setIsUnlocked(true);
                    loadConversations();
                }}
            />
        </Box>
    );
};
