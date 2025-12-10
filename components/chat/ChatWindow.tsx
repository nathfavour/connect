'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChatService } from '@/lib/services/chat';
import { useAuth } from '@/lib/auth';
import { Messages } from '@/types/appwrite';
import { useRouter } from 'next/navigation';
import { 
    Box, 
    Paper, 
    Typography, 
    TextField, 
    IconButton, 
    Button, 
    CircularProgress,
    AppBar,
    Toolbar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CallIcon from '@mui/icons-material/Call';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const ChatWindow = ({ conversationId }: { conversationId: string }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Messages[]>([]);
    const [conversation, setConversation] = useState<any>(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (conversationId) {
            loadMessages();
            loadConversation();
            const interval = setInterval(loadMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadConversation = async () => {
        try {
            const conv = await ChatService.getConversationById(conversationId);
            if (conv.type === 'direct') {
                const otherId = conv.participants.find((p: string) => p !== user!.$id);
                if (otherId) {
                    try {
                        const profile = await UsersService.getProfileById(otherId);
                        setConversation({ 
                            ...conv, 
                            name: profile ? (profile.displayName || profile.username) : 'User' 
                        });
                    } catch (e) {
                        setConversation({ ...conv, name: 'User' });
                    }
                } else {
                    setConversation({ ...conv, name: 'Note to Self' });
                }
            } else {
                setConversation(conv);
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const loadMessages = async () => {
        try {
            const response = await ChatService.getMessages(conversationId);
            setMessages(response.rows.reverse() as unknown as Messages[]);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !user) return;

        const text = inputText;
        setInputText('');

        try {
            await ChatService.sendMessage(conversationId, user.$id, text);
            loadMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
            setInputText(text);
        }
    };

    const handleCall = () => {
        router.push(`/call/${conversationId}?caller=true`);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
            {/* Header */}
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar>
                    <IconButton edge="start" onClick={() => router.back()} sx={{ mr: 1 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {conversation?.name || 'Chat'}
                    </Typography>
                    <Button 
                        variant="contained" 
                        startIcon={<CallIcon />} 
                        onClick={handleCall}
                        sx={{ borderRadius: 5 }}
                    >
                        Call
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.$id;
                    
                    if (msg.type === 'call_signal') {
                        try {
                            const signal = JSON.parse(msg.content || '{}');
                            if (signal.type === 'offer') {
                                return (
                                    <Box key={msg.$id} sx={{ alignSelf: 'center', my: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<CallIcon />}
                                            onClick={() => router.push(`/call/${conversationId}`)}
                                            sx={{ borderRadius: 5 }}
                                        >
                                            Join Call
                                        </Button>
                                    </Box>
                                );
                            }
                            return null;
                        } catch (e) { return null; }
                    }

                    return (
                        <Box 
                            key={msg.$id} 
                            sx={{ 
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '70%',
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: isMe ? 'primary.main' : 'grey.200',
                                color: isMe ? 'primary.contrastText' : 'text.primary',
                                borderBottomRightRadius: isMe ? 0 : 2,
                                borderBottomLeftRadius: isMe ? 2 : 0
                            }}
                        >
                            <Typography variant="body1">{msg.content}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', opacity: 0.7, mt: 0.5 }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        </Box>
                    );
                })}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Paper 
                component="form" 
                onSubmit={handleSend} 
                sx={{ p: 2, display: 'flex', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}
                elevation={0}
            >
                <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1, '& .MuiOutlinedInput-root': { borderRadius: 5 } }}
                />
                <IconButton 
                    type="submit" 
                    color="primary" 
                    disabled={!inputText.trim()}
                    sx={{ bgcolor: inputText.trim() ? 'primary.main' : 'action.disabledBackground', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                    <SendIcon />
                </IconButton>
            </Paper>
        </Box>
    );
};
