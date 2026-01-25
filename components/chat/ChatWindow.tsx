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
import { format } from 'date-fns';
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
    ListItemIcon,
    Avatar,
    Stack,
    useTheme,
    useMediaQuery
} from '@mui/material';
import SendIcon from '@mui/icons-material/SendOutlined';
import CallIcon from '@mui/icons-material/CallOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBackIosNewOutlined';
import AttachFileIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import MicIcon from '@mui/icons-material/MicNoneOutlined';
import StopIcon from '@mui/icons-material/StopCircleOutlined';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import AudiotrackIcon from '@mui/icons-material/AudiotrackOutlined';
import VideoFileIcon from '@mui/icons-material/VideoCameraFrontOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import DoneIcon from '@mui/icons-material/DoneOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAllOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVertOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import BookmarkIcon from '@mui/icons-material/BookmarkOutlined';
import GroupIcon from '@mui/icons-material/GroupWorkOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import NoteIcon from '@mui/icons-material/DescriptionOutlined';
import KeyIcon from '@mui/icons-material/VpnKeyOutlined';
import { NoteSelectorModal } from './NoteSelectorModal';
import { SecretSelectorModal } from './SecretSelectorModal';

export const ChatWindow = ({ conversationId }: { conversationId: string }) => {
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [messages, setMessages] = useState<Messages[]>([]);
    const [conversation, setConversation] = useState<any>(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [attachAnchorEl, setAttachAnchorEl] = useState<null | HTMLElement>(null);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [secretModalOpen, setSecretModalOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (conversationId) {
            loadMessages();
            loadConversation();
            
            // Subscribe to real-time messages
            let unsub: any;
            const initRealtime = async () => {
                unsub = await realtime.subscribe(
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
            };

            initRealtime();

            return () => {
                if (typeof unsub === 'function') unsub();
                else if (unsub?.unsubscribe) unsub.unsubscribe();
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

    const handleNoteSelect = async (note: any) => {
        if (!user) return;
        setSending(true);
        try {
            await ChatService.sendMessage(
                conversationId, 
                user.$id, 
                note.title || 'Attached Note', 
                'note' as any, 
                [note.$id]
            );
        } catch (error) {
            console.error('Failed to send note:', error);
        } finally {
            setSending(false);
        }
    };

    const handleSecretSelect = async (item: any, type: 'secret' | 'totp') => {
        if (!user) return;
        setSending(true);
        try {
            if (type === 'totp') {
                const content = `TOTP Code for ${item.issuer || 'Unknown'}: ${item.currentCode}`;
                await ChatService.sendMessage(
                    conversationId, 
                    user.$id, 
                    content, 
                    'totp' as any, 
                    [item.$id]
                );
            } else {
                await ChatService.sendMessage(
                    conversationId, 
                    user.$id, 
                    `Shared Secret: ${item.name || 'Unnamed'}`, 
                    'secret' as any, 
                    [item.$id]
                );
            }
        } catch (error) {
            console.error('Failed to send secret/totp:', error);
        } finally {
            setSending(false);
        }
    };

    const renderMessageContent = (msg: Messages) => {
        if (msg.type === 'text') {
            return <Typography variant="body1">{msg.content}</Typography>;
        }

        if (msg.type === ('note' as any)) {
            return (
                <Box 
                    sx={{ 
                        p: 1.5, 
                        bgcolor: 'rgba(255, 255, 255, 0.05)', 
                        borderRadius: 2, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' }
                    }}
                    onClick={() => window.open(`https://note.whisperrnote.space/n/${msg.attachments?.[0]}`, '_blank')}
                >
                    <NoteIcon sx={{ color: 'primary.main' }} />
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{msg.content}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>Attached Note</Typography>
                    </Box>
                </Box>
            );
        }

        if (msg.type === ('secret' as any)) {
            return (
                <Box 
                    sx={{ 
                        p: 1.5, 
                        bgcolor: 'rgba(255, 255, 255, 0.05)', 
                        borderRadius: 2, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' }
                    }}
                    onClick={() => window.open(`https://keep.whisperrnote.space/vault?id=${msg.attachments?.[0]}`, '_blank')}
                >
                    <ShieldIcon sx={{ color: 'primary.main' }} />
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{msg.content}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>Shared Secret</Typography>
                    </Box>
                </Box>
            );
        }

        if (msg.type === ('totp' as any)) {
            const codeMatch = msg.content?.match(/(\d{3}\s?\d{3})$/);
            const code = codeMatch ? codeMatch[1] : '';
            const label = msg.content?.replace(code, '').trim();

            return (
                <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 240, 255, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <KeyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1 }}>TOTP Code Shared</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>{label}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: 2, color: 'primary.main', textAlign: 'center', py: 1, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                        {code}
                    </Typography>
                </Box>
            );
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

    const isSelf = conversation?.type === 'direct' && conversation?.participants?.length === 1;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default', position: 'relative' }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
                <Toolbar sx={{ gap: 1 }}>
                    <IconButton edge="start" onClick={() => router.back()} sx={{ color: 'text.secondary' }}>
                        <ArrowBackIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                        <Avatar sx={{ 
                            width: 36, 
                            height: 36, 
                            bgcolor: isSelf ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: isSelf ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            {isSelf ? <BookmarkIcon sx={{ fontSize: 18, color: 'primary.main' }} /> : (conversation?.type === 'group' ? <GroupIcon /> : <PersonIcon sx={{ fontSize: 20 }} />)}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: 'var(--font-space-grotesk)', lineHeight: 1.2, color: isSelf ? 'primary.main' : 'text.primary' }}>
                                {isSelf ? 'Saved Messages' : conversation?.name || 'Loading...'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.6 }}>
                                {isSelf ? 'End-to-end encrypted vault' : 'Online'}
                            </Typography>
                        </Box>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                        <IconButton onClick={() => {}} sx={{ color: 'text.secondary' }}>
                            <CallIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                            <MoreVertIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{
                    sx: {
                        mt: 1,
                        borderRadius: '16px',
                        bgcolor: 'rgba(15, 15, 15, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundImage: 'none',
                        minWidth: 180
                    }
                }}
            >
                <MenuItem onClick={() => setAnchorEl(null)} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                    <InfoIcon sx={{ fontSize: 18, opacity: 0.7 }} /> Profile Details
                </MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                    <ShieldIcon sx={{ fontSize: 18, opacity: 0.7 }} /> Privacy Settings
                </MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem', color: '#ff4d4d' }}>
                    <DeleteIcon sx={{ fontSize: 18, opacity: 0.7 }} /> Clear History
                </MenuItem>
            </Menu>

            {/* Messages Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: 'primary.main' }} /></Box>
                ) : (
                    messages.map((msg, index) => (
                        <Box key={msg.$id} sx={{
                            alignSelf: msg.senderId === user?.$id ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5
                        }}>
                            <Paper sx={{
                                p: 1.5,
                                px: 2,
                                borderRadius: msg.senderId === user?.$id ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                bgcolor: msg.senderId === user?.$id ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                border: msg.senderId === user?.$id ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                color: 'text.primary',
                                boxShadow: 'none'
                            }}>
                                {renderMessageContent(msg)}
                            </Paper>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, alignSelf: msg.senderId === user?.$id ? 'flex-end' : 'flex-start', px: 0.5 }}>
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 600 }}>
                                    {format(new Date(msg.$createdAt || Date.now()), 'h:mm a')}
                                </Typography>
                                {msg.senderId === user?.$id && (
                                    msg.readBy?.length && msg.readBy.length > 1 ? <DoneAllIcon sx={{ fontSize: 12, color: 'primary.main' }} /> : <DoneIcon sx={{ fontSize: 12, opacity: 0.4 }} />
                                )}
                            </Box>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 2, pb: isMobile ? 4 : 2, bgcolor: 'transparent' }}>
                <Paper elevation={0} sx={{ 
                    p: 0.5, 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    gap: 0.5, 
                    borderRadius: '24px', 
                    bgcolor: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:focus-within': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                    }
                }}>
                    <IconButton 
                        size="small" 
                        onClick={(e) => setAttachAnchorEl(e.currentTarget)} 
                        sx={{ color: 'text.secondary', p: 1.2 }}
                    >
                        <AttachFileIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                    <input type="file" hidden ref={fileInputRef} onChange={onFileChange} />

                    <Menu
                        anchorEl={attachAnchorEl}
                        open={Boolean(attachAnchorEl)}
                        onClose={() => setAttachAnchorEl(null)}
                        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        PaperProps={{
                            sx: {
                                mb: 1,
                                borderRadius: '16px',
                                bgcolor: 'rgba(15, 15, 15, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backgroundImage: 'none',
                                minWidth: 200
                            }
                        }}
                    >
                        <MenuItem onClick={() => { handleFileSelect('*'); setAttachAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                            <InsertDriveFileIcon sx={{ fontSize: 18, opacity: 0.7 }} /> Upload File
                        </MenuItem>
                        <MenuItem onClick={() => { setNoteModalOpen(true); setAttachAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                            <NoteIcon sx={{ fontSize: 18, opacity: 0.7 }} /> Attach Note
                        </MenuItem>
                        <MenuItem onClick={() => { setSecretModalOpen(true); setAttachAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                            <KeyIcon sx={{ fontSize: 18, opacity: 0.7 }} /> Attach Secret (Keep)
                        </MenuItem>
                    </Menu>
                    
                    <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        variant="standard"
                        InputProps={{
                            disableUnderline: true,
                            sx: { py: 1.2, px: 1, fontSize: '0.95rem' }
                        }}
                    />

                    {inputText.trim() || attachment ? (
                        <IconButton 
                            onClick={() => handleSend()} 
                            disabled={sending} 
                            sx={{ 
                                bgcolor: 'primary.main', 
                                color: 'black', 
                                m: 0.5,
                                '&:hover': { bgcolor: 'rgba(0, 240, 255, 0.8)' },
                                '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.1)' }
                            }}
                        >
                            {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon sx={{ fontSize: 20 }} />}
                        </IconButton>
                    ) : (
                        <IconButton 
                            onClick={() => setIsRecording(!isRecording)} 
                            sx={{ 
                                color: isRecording ? '#ff4d4d' : 'text.secondary',
                                p: 1.2,
                                animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                            }}
                        >
                            {isRecording ? <StopIcon sx={{ fontSize: 24 }} /> : <MicIcon sx={{ fontSize: 24 }} />}
                        </IconButton>
                    )}
                </Paper>
            </Box>

            <NoteSelectorModal 
                open={noteModalOpen} 
                onClose={() => setNoteModalOpen(false)} 
                onSelect={handleNoteSelect} 
            />
            <SecretSelectorModal 
                open={secretModalOpen} 
                onClose={() => setSecretModalOpen(false)} 
                onSelect={handleSecretSelect}
                isSelf={isSelf || false}
            />
        </Box>
    );
};
