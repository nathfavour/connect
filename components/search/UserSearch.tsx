'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UsersService } from '@/lib/services/users';
import { Users } from '@/types/appwrite';
import { ChatService } from '@/lib/services/chat';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
    Box,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Paper,
    IconButton,
    CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MessageIcon from '@mui/icons-material/Message';
import PersonIcon from '@mui/icons-material/Person';
import { fetchProfilePreview } from '@/lib/profile-preview';

import { useSudo } from '@/context/SudoContext';
import { ecosystemSecurity } from '@/lib/ecosystem/security';

const SearchResultAvatar = ({ u }: { u: any }) => {
    return (
        <Avatar 
            src={u.avatarUrl} 
            sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: 44,
                height: 44
            }}
        >
            {!u.avatarUrl && <PersonIcon sx={{ color: 'rgba(255, 255, 255, 0.3)' }} />}
        </Avatar>
    );
};

export const UserSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Users[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const router = useRouter();
    const { requestSudo } = useSudo();

    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await UsersService.searchUsers(query);
            setResults(res.rows);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else {
                setResults([]);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [query, handleSearch]);

    const startChat = async (targetUserId: string) => {
        if (!user) return;
        
        // Ensure MasterPass/Sudo is setup and unlocked before chatting
        requestSudo({
            onSuccess: async () => {
                try {
                    const existing = await ChatService.getConversations(user.$id);

                    let found;
                    if (targetUserId === user.$id) {
                        // Self chat: look for direct chat with only 1 participant (me)
                        found = existing.rows.find((c: any) =>
                            c.type === 'direct' &&
                            c.participants.length === 1 &&
                            c.participants[0] === user.$id
                        );
                    } else {
                        // Other chat: look for direct chat with target
                        found = existing.rows.find((c: any) =>
                            c.type === 'direct' &&
                            c.participants.includes(targetUserId) &&
                            c.participants.length > 1
                        );
                    }

                    if (found) {
                        router.push(`/chat/${found.$id}`);
                    } else {
                        const participants = targetUserId === user.$id ? [user.$id] : [user.$id, targetUserId];
                        const newConv = await ChatService.createConversation(participants, 'direct');
                        router.push(`/chat/${newConv.$id}`);
                    }
                } catch (error: unknown) {
                    console.error('Failed to start chat:', error);
                }
            }
        });
    };

    return (
        <Box sx={{ p: 2 }}>
            <Paper
                component="form"
                onSubmit={handleSearch}
                sx={{ 
                    p: '8px 16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 4,
                    borderRadius: '16px',
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'none'
                }}
            >
                <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.3)', mr: 2 }} />
                <TextField
                    sx={{ flex: 1 }}
                    placeholder="Search by name or @username..."
                    variant="standard"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    InputProps={{ 
                        disableUnderline: true,
                        sx: { color: 'white', fontWeight: 500 }
                    }}
                />
                {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
            </Paper>

            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(results as any[]).map((u) => (
                    <Paper 
                        key={u.$id} 
                        sx={{ 
                            borderRadius: '20px',
                            bgcolor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.04)',
                                borderColor: 'rgba(0, 240, 255, 0.2)'
                            }
                        }} 
                        elevation={0}
                    >
                        <ListItem
                            sx={{ 
                                p: 2,
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                                }
                            }}
                            onClick={() => startChat(u.$id)}
                        >
                            <ListItemAvatar sx={{ mr: 1 }}>
                                <SearchResultAvatar u={u} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Typography sx={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>
                                        {u.displayName || u.username}
                                    </Typography>
                                }
                                secondary={
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem', fontWeight: 600 }}>
                                        @{u.username}
                                    </Typography>
                                }
                            />
                        </ListItem>
                    </Paper>
                ))}
                {results.length === 0 && query.trim().length >= 2 && !loading && (
                    <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>No users found</Typography>
                        <Typography variant="body2">Try a different name or @username</Typography>
                    </Box>
                )}
            </List>
        </Box>
    );
};
