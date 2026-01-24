'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChatService } from '@/lib/services/chat';
import { StorageService } from '@/lib/services/storage';
import { useAuth } from '@/lib/auth';
import { UsersService } from '@/lib/services/users';
import { Messages } from '@/types/appwrite';
import { useRouter } from 'next/navigation';
import { realtime } from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Button,
    CircularProgress,
    AppBar,
    Toolbar,
    Menu,
    MenuItem,
    ListItemIcon
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CallIcon from '@mui/icons-material/Call';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ImageIcon from '@mui/icons-material/ImageIcon';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';

export const ChatWindow = ({ conversationId }: { conversationId: string }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Messages[]>([]);
    const [conversation, setConversation] = useState<any>(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (conversationId) {
            loadMessages();
            loadConversation();
            
            // Subscribe to real-time messages
            const unsubscribe = realtime.subscribe(
                [`databases.${APPWRITE_CONFIG.DATABASES.CHAT}.collections.${APPWRITE_CONFIG.TABLES.CHAT.MESSAGES}.documents`],
                (response) => {
                    const payload = response.payload as Messages;
                    if (payload.conversationId === conversationId) {
                        if (response.events.some(e => e.includes('.create'))) {
                            setMessages(prev => {
                                // Avoid duplicates
                                if (prev.some(m => m.$id === payload.$id)) return prev;
                                return [...prev, payload];
                            });
                            // Mark as read if not from me
                            if (user && payload.senderId !== user.$id) {
                                ChatService.markAsRead(payload.$id, user.$id);
                            }
                        } else if (response.events.some(e => e.includes('.update'))) {
                            setMessages(prev => prev.map(m => m.$id === payload.$id ? payload : m));
                        } else if (response.events.some(e => e.includes('.delete'))) {
                            setMessages(prev => prev.filter(m => m.$id === payload.$id));
                        }
                    }
                }
            );

            return () => {
                unsubscribe();
            };
        }
    }, [conversationId, user]);

    useEffect(() => {
        if (conversationId && user) {
            ChatService.markConversationAsRead(conversationId, user.$id);
        }
    }, [conversationId, user]);

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
            // Reverse once for display order (bottom is newest)
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

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!inputText.trim() && !attachment) || !user || sending) return;

        setSending(true);
        const text = inputText;
        const file = attachment;

        setInputText('');
        setAttachment(null);

        try {
            let type: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text';
            let attachments: string[] = [];

            if (file) {
                // Determine type
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else type = 'file';

                // Upload file
                const bucketId = StorageService.getBucketForType(type);
                const uploaded = await StorageService.uploadFile(file, bucketId);
                attachments = [uploaded.$id];
            }

            await ChatService.sendMessage(conversationId, user.$id, text, type, attachments);
            // Message will be added via Realtime subscriber
        } catch (error) {
            console.error('Failed to send message:', error);
            setInputText(text);
            setAttachment(file);
        } finally {
            setSending(false);
        }
    };

    const handleCall = () => {
        router.push(`/call/${conversationId}?caller=true`);
    };

    const handleAttachClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleAttachClose = () => {
        setAnchorEl(null);
    };

    const handleFileSelect = (type: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = type;
            fileInputRef.current.click();
        }
        handleAttachClose();
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
            // Mock voice note for now
        } else {
            setIsRecording(true);
        }
    };

    const renderMessageContent = (msg: Messages) => {
        if (msg.type === 'text') {
            return <Typography variant="body1">{msg.content}</Typography>;
        }

        const fileId = msg.attachments && msg.attachments[0];
        if (!fileId) return <Typography variant="body1">{msg.content}</Typography>;

        const bucketId = StorageService.getBucketForType(msg.type as any);
        const viewUrl = StorageService.getFileView(fileId, bucketId);
        const previewUrl = StorageService.getFilePreview(fileId, bucketId, 300, 300);

        switch (msg.type) {
            case 'image':
                return (
                    <Box>
                        <img
                            src={previewUrl}
                            alt="attachment"
                            style={{ maxWidth: '100%', borderRadius: 8, cursor: 'pointer' }}
                            onClick={() => window.open(viewUrl, '_blank')}
                        />
                        {msg.content && <Typography variant="body2" sx={{ mt: 1 }}>{msg.content}</Typography>}
                    </Box>
                );
            case 'video':
                return (
                    <Box>
                        <video
                            src={viewUrl}
                            controls
                            style={{ maxWidth: '100%', borderRadius: 8 }}
                        />
                        {msg.content && <Typography variant="body2" sx={{ mt: 1 }}>{msg.content}</Typography>}
                    </Box>
                );
            case 'audio':
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <audio src={viewUrl} controls style={{ height: 40 }} />
                    </Box>
                );
            default:
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                        <InsertDriveFileIcon />
                        <Typography
                            variant="body2"
                            component="a"
                            href={StorageService.getFileDownload(fileId, bucketId)}
                            target="_blank"
                            sx={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            Download File
                        </Typography>
                    </Box>
                );
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
            {/* Header */}
            <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Toolbar>
                    <IconButton edge="start" onClick={() => router.back()} sx={{ mr: 1 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        {conversation?.name || 'Chat'}
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<CallIcon />}
                        onClick={handleCall}
                        sx={{ borderRadius: 4, boxShadow: 'none' }}
                    >
                        Call
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                maxWidth: '75%',
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: isMe ? 'primary.main' : 'background.paper',
                                color: isMe ? 'primary.contrastText' : 'text.primary',
                                borderBottomRightRadius: isMe ? 4 : 16,
                                borderBottomLeftRadius: isMe ? 16 : 4,
                                boxShadow: 1
                            }}
                        >
                            {renderMessageContent(msg)}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                                {isMe && (
                                    msg.readBy && msg.readBy.length > 1 ? (
                                        <DoneAllIcon sx={{ fontSize: '0.9rem', color: 'primary.contrastText' }} />
                                    ) : (
                                        <DoneIcon sx={{ fontSize: '0.9rem', color: 'primary.contrastText', opacity: 0.7 }} />
                                    )
                                )}
                            </Box>
                        </Box>
                    );
                })}
                <div ref={messagesEndRef} />
            </Box>

            {/* Attachment Preview */}
            {attachment && (
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <InsertDriveFileIcon color="primary" />
                    <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                        {attachment.name}
                    </Typography>
                    <IconButton size="small" onClick={() => setAttachment(null)}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            )}

            {/* Input */}
            <Paper
                component="form"
                onSubmit={handleSend}
                sx={{ p: 2, display: 'flex', alignItems: 'center', borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
                elevation={0}
            >
                <IconButton onClick={handleAttachClick} color="primary" sx={{ mr: 1 }}>
                    <AttachFileIcon />
                </IconButton>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleAttachClose}
                >
                    <MenuItem onClick={() => handleFileSelect('image/*')}>
                        <ListItemIcon><ImageIcon fontSize="small" /></ListItemIcon>
                        Image
                    </MenuItem>
                    <MenuItem onClick={() => handleFileSelect('video/*')}>
                        <ListItemIcon><VideoFileIcon fontSize="small" /></ListItemIcon>
                        Video
                    </MenuItem>
                    <MenuItem onClick={() => handleFileSelect('audio/*')}>
                        <ListItemIcon><AudiotrackIcon fontSize="small" /></ListItemIcon>
                        Audio
                    </MenuItem>
                    <MenuItem onClick={() => handleFileSelect('*/*')}>
                        <ListItemIcon><InsertDriveFileIcon fontSize="small" /></ListItemIcon>
                        File
                    </MenuItem>
                </Menu>

                <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    onChange={onFileChange}
                />

                <TextField
                    fullWidth
                    placeholder={isRecording ? "Recording..." : "Type a message..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    variant="outlined"
                    size="small"
                    disabled={isRecording || sending}
                    sx={{
                        mr: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 4,
                            bgcolor: 'background.default'
                        }
                    }}
                />

                {inputText.trim() || attachment ? (
                    <IconButton
                        type="submit"
                        color="primary"
                        disabled={sending}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': { bgcolor: 'primary.dark' },
                            width: 40,
                            height: 40
                        }}
                    >
                        {sending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                    </IconButton>
                ) : (
                    <IconButton
                        onClick={toggleRecording}
                        color={isRecording ? "error" : "default"}
                        sx={{
                            bgcolor: isRecording ? 'error.light' : 'transparent',
                            '&:hover': { bgcolor: isRecording ? 'error.main' : 'action.hover' }
                        }}
                    >
                        {isRecording ? <StopIcon /> : <MicIcon />}
                    </IconButton>
                )}
            </Paper>
        </Box>
    );
};
