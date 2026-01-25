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
    IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MessageIcon from '@mui/icons-material/Message';
import PersonIcon from '@mui/icons-material/Person';
import { fetchProfilePreview } from '@/lib/profile-preview';

const SearchResultAvatar = ({ u }: { u: any }) => {
    const [url, setUrl] = useState<string | null>(u.avatarUrl || null);

    useEffect(() => {
        const fileId = u.avatarFileId || u.profilePicId;
        if (!fileId || url) return;

        let mounted = true;
        const load = async () => {
            const previewUrl = await fetchProfilePreview(fileId, 64, 64);
            if (mounted && previewUrl) setUrl(previewUrl);
        };
        load();
        return () => { mounted = false; };
    }, [u]);

    return (
        <Avatar src={url || undefined}>
            {!url && <PersonIcon />}
        </Avatar>
    );
};

export const UserSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Users[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const fetchResults = async (term: string) => {
        if (!term.trim() || term.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await UsersService.searchUsers(term);
            const filtered = (response.rows || []).filter((u: any) => {
                if (u.privacySettings) {
                    try {
                        const settings = JSON.parse(u.privacySettings);
                        if (settings.searchable === false) return false;
                    } catch (e) { }
                }
                return true;
            }) as unknown as Users[];
            setResults(filtered);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchResults(query);
    };

    const startChat = async (targetUserId: string) => {
        if (!user) return;
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
        } catch (error) {
            console.error('Failed to start chat:', error);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Paper
                component="form"
                onSubmit={handleSearch}
                sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', mb: 3 }}
            >
                <TextField
                    sx={{ ml: 1, flex: 1 }}
                    placeholder="Search username..."
                    variant="standard"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                />
                <IconButton type="submit" sx={{ p: '10px' }} aria-label="search" disabled={loading}>
                    <SearchIcon />
                </IconButton>
            </Paper>

            <List>
                {(results as any[]).map((u) => (
                    <Paper key={u.$id} sx={{ mb: 1, overflow: 'hidden' }} variant="outlined">
                        <ListItem
                            secondaryAction={
                                <Button
                                    variant="outlined"
                                    startIcon={<MessageIcon />}
                                    onClick={() => startChat(u.$id)}
                                    size="small"
                                    sx={{ borderRadius: 5 }}
                                >
                                    Message
                                </Button>
                            }
                        >
                            <ListItemAvatar>
                                <SearchResultAvatar u={u} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={u.displayName || u.username}
                                secondary={`@${u.username}`}
                            />
                        </ListItem>
                    </Paper>
                ))}
                {results.length === 0 && query && !loading && (
                    <Typography align="center" color="text.secondary">No users found</Typography>
                )}
            </List>
        </Box>
    );
};
