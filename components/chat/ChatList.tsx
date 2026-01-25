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
    Divider
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import BookmarkIcon from '@mui/icons-material/Bookmark';

export const ChatList = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user]);

    const loadConversations = async () => {
        try {
            const response = await ChatService.getConversations(user!.$id);
            let rows = [...response.rows];

            // Bridge: Ensure self-chat (Saved Messages) exists
            const selfChat = rows.find(c => c.type === 'direct' && c.participants.length === 1 && c.participants[0] === user!.$id);
            
            if (!selfChat) {
                try {
                    const newSelfChat = await ChatService.createConversation([user!.$id], 'direct');
                    rows = [newSelfChat, ...rows];
                } catch (e) {
                    console.error('Failed to auto-create self chat', e);
                }
            }

            // Enrich with other participant's name
            const enriched = await Promise.all(rows.map(async (conv: any) => {
                if (conv.type === 'direct') {
                    const otherId = conv.participants.find((p: string) => p !== user!.$id);
                    if (otherId) {
                        try {
                            const profile = await UsersService.getProfileById(otherId);
                            return { 
                                ...conv, 
                                otherUserId: otherId, 
                                name: profile ? (profile.displayName || profile.username) : ('User ' + otherId.substring(0, 5)) 
                            };
                        } catch (e) {
                            return conv;
                        }
                    } else {
                        // Self Chat (participants only contains me)
                        return {
                            ...conv,
                            otherUserId: user!.$id,
                            name: 'Saved Messages (Me)',
                            isSelf: true
                        };
                    }
                }
                return conv;
            }));

            // Sort: Self chat always on top if no recent activity, otherwise standard sort
            const sorted = enriched.sort((a, b) => {
                if (a.isSelf && !a.lastMessageAt) return -1;
                if (b.isSelf && !b.lastMessageAt) return 1;
                const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
                const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
                return timeB - timeA;
            });

            setConversations(sorted);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight="bold">Messages</Typography>
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {conversations.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography>No conversations yet.</Typography>
                        <Typography variant="body2">Search for someone to chat with!</Typography>
                    </Box>
                ) : (
                    <List>
                        {conversations.map((conv) => (
                            <React.Fragment key={conv.$id}>
                                <ListItem disablePadding>
                                    <ListItemButton component={Link} href={`/chat/${conv.$id}`}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: conv.isSelf ? 'primary.main' : undefined }}>
                                                {conv.isSelf ? <BookmarkIcon /> : (conv.type === 'group' ? <GroupIcon /> : <PersonIcon />)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={conv.name || (conv.type === 'direct' ? conv.otherUserId : 'Group Chat')}
                                            secondary={new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString()}
                                            primaryTypographyProps={{ fontWeight: 'medium' }}
                                            secondaryTypographyProps={{ noWrap: true }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
};
