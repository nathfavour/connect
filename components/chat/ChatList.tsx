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
            // Enrich with other participant's name
            const enriched = await Promise.all(response.rows.map(async (conv: any) => {
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
                            name: 'Note to Self'
                        };
                    }
                }
                return conv;
            }));
            setConversations(enriched);
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
                                            <Avatar>
                                                {conv.type === 'group' ? <GroupIcon /> : <PersonIcon />}
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
