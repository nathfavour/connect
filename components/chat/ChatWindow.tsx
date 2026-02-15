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
    Divider,
    ListItemIcon,
    Avatar,
    Stack,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { 
    Send, 
    Phone, 
    ChevronLeft, 
    PlusCircle, 
    Mic, 
    Square, 
    Image, 
    Music, 
    Video, 
    File, 
    X, 
    Check, 
    CheckCheck, 
    MoreVertical, 
    Info, 
    Shield, 
    Bookmark, 
    Users, 
    User, 
    Trash2, 
    FileText, 
    Key 
} from 'lucide-react';
import { NoteSelectorModal } from './NoteSelectorModal';
import { SecretSelectorModal } from './SecretSelectorModal';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { MasterPassModal } from './MasterPassModal';

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
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(ecosystemSecurity.status.isUnlocked);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const checkUnlock = setInterval(() => {
            if (ecosystemSecurity.status.isUnlocked !== isUnlocked) {
                setIsUnlocked(ecosystemSecurity.status.isUnlocked);
                if (ecosystemSecurity.status.isUnlocked) {
                    loadMessages();
                    loadConversation();
                }
            }
        }, 1000);
        return () => clearInterval(checkUnlock);
    }, [isUnlocked]);

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
            const conv = await ChatService.getConversationById(conversationId);
            
            // Filter by clearedAt if exists in settings
            let displayMessages = response.rows;
            if (user && conv.settings) {
                try {
                    const decryptedSettings = await ecosystemSecurity.decrypt(conv.settings);
                    const settings = JSON.parse(decryptedSettings);
                    const myClearedAt = settings.clearedAt?.[user.$id];
                    if (myClearedAt) {
                        displayMessages = displayMessages.filter((m: any) => new Date(m.$createdAt) > new Date(myClearedAt));
                    }
                } catch (e) {}
            }

            // Reverse once for display order (bottom is newest)
            setMessages(displayMessages.reverse() as unknown as Messages[]);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = async (mode: 'me' | 'everyone') => {
        if (!user || !confirm(`Are you sure you want to wipe this chat ${mode === 'me' ? 'for yourself' : 'for everyone'}?`)) return;
        
        setLoading(true);
        try {
            if (isSelf) {
                await ChatService.nuclearWipe(conversationId);
            } else {
                if (mode === 'everyone') {
                    await ChatService.wipeMyFootprint(conversationId, user.$id);
                }
                await ChatService.clearChatForMe(conversationId, user.$id);
            }
            await loadMessages();
            setAnchorEl(null);
        } catch (e) {
            console.error('Wipe failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        const data = messages.map(m => ({
            sender: m.senderId === user?.$id ? 'Me' : 'Partner',
            time: m.$createdAt,
            content: m.content,
            type: m.type
        }));
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_export_${conversationId}.json`;
        a.click();
        setAnchorEl(null);
    };

    const handleDeleteMessage = async (messageId: string, everyone: boolean) => {
        try {
            if (everyone) {
                await ChatService.deleteMessage(messageId);
            } else {
                // Individual 'delete for me' would require a schema change (deletedBy array)
                // For now, we only support 'delete for everyone' if author.
                alert("Individual 'Delete for Me' is coming soon. Use 'Clear Chat' for now.");
            }
        } catch (e) {
            console.error('Delete failed:', e);
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

        let type: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text';
        let initialAttachments: string[] = [];
        if (file) {
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';
            else type = 'file';
        }

        // Optimistic UI Update: Add the plaintext message to the local state immediately
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticMessage: any = {
            $id: optimisticId,
            conversationId,
            senderId: user.$id,
            content: text,
            type,
            attachments: initialAttachments,
            $createdAt: new Date().toISOString(),
            status: 'sending'
        };

        if (type === 'text') {
            setMessages(prev => [...prev, optimisticMessage]);
            setTimeout(() => scrollToBottom(), 50);
        }

        try {
            let actualAttachments = initialAttachments;
            if (file) {
                const bucketId = StorageService.getBucketForType(type as any);
                const uploaded = await StorageService.uploadFile(file, bucketId);
                actualAttachments = [uploaded.$id];
            }

            await ChatService.sendMessage(conversationId, user.$id, text, type, actualAttachments);
            
            // Remove optimistic message if it was text (Realtime will bring the official one)
            if (type === 'text') {
                setMessages(prev => prev.filter(m => m.$id !== optimisticId));
            }
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
                    onClick={() => window.open(`https://note.kylrixnote.space/n/${msg.attachments?.[0]}`, '_blank')}
                >
                    <FileText size={20} color="#00F5FF" strokeWidth={1.5} />
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
                    onClick={() => window.open(`https://keep.kylrixnote.space/vault?id=${msg.attachments?.[0]}`, '_blank')}
                >
                    <Shield size={20} color="#00F5FF" strokeWidth={1.5} />
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
                        <Key size={16} color="#00F5FF" strokeWidth={1.5} />
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
                        <File size={18} strokeWidth={1.5} />
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

    const isSelf = conversation?.type === 'direct' && conversation?.participants?.every((p: string) => p === user?.$id);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default', position: 'relative' }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
                <Toolbar sx={{ gap: 1 }}>
                    <IconButton edge="start" onClick={() => router.back()} sx={{ color: 'text.secondary' }}>
                        <ChevronLeft size={20} strokeWidth={1.5} />
                    </IconButton>
                    <Box 
                        onClick={(e) => setAnchorEl(e.currentTarget)} 
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                    >
                        <Avatar sx={{ 
                            width: 36, 
                            height: 36, 
                            bgcolor: isSelf ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: isSelf ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            {isSelf ? <Bookmark size={18} color="#00F5FF" strokeWidth={1.5} /> : (conversation?.type === 'group' ? <Users size={20} strokeWidth={1.5} /> : <User size={20} strokeWidth={1.5} />)}
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
                        <IconButton onClick={handleCall} sx={{ color: 'text.secondary' }}>
                            <Phone size={20} strokeWidth={1.5} />
                        </IconButton>
                        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                            <MoreVertical size={20} strokeWidth={1.5} />
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
                        minWidth: 220
                    }
                }}
            >
                <MenuItem onClick={handleExport} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                    <File size={18} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Export Chat (.json)
                </MenuItem>
                
                <Divider sx={{ my: 1, opacity: 0.1 }} />

                <MenuItem onClick={() => handleClearChat('me')} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                    <Trash2 size={18} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Clear Chat (For Me)
                </MenuItem>

                {!isSelf && (
                    <MenuItem onClick={() => handleClearChat('everyone')} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem', color: '#ff4d4d' }}>
                        <Shield size={18} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Wipe My Footprint
                    </MenuItem>
                )}

                {isSelf && (
                    <MenuItem onClick={() => handleClearChat('everyone')} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem', color: '#ff4d4d' }}>
                        <Trash2 size={18} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Nuclear Wipe
                    </MenuItem>
                )}
            </Menu>

            {/* Messages Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {conversation?.isEncrypted && !isUnlocked && (
                    <Box sx={{ p: 2, mb: 2, bgcolor: 'rgba(0, 240, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.1)', textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main' }}>
                            This conversation is end-to-end encrypted.
                        </Typography>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={() => setUnlockModalOpen(true)}
                            startIcon={<Key size={16} strokeWidth={1.5} />}
                            sx={{ borderRadius: '10px', fontWeight: 800 }}
                        >
                            Unlock Vault to Read
                        </Button>
                    </Box>
                )}
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
                                    msg.readBy?.length && msg.readBy.length > 1 ? <CheckCheck size={12} color="#00F5FF" strokeWidth={1.5} /> : <Check size={12} strokeWidth={1.5} style={{ opacity: 0.4 }} />
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
                        <PlusCircle size={22} strokeWidth={1.5} />
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
                            <File size={18} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Upload File
                        </MenuItem>
                        <MenuItem onClick={() => { setNoteModalOpen(true); setAttachAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                            <FileText size={18} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Attach Note
                        </MenuItem>
                        <MenuItem onClick={() => { setSecretModalOpen(true); setAttachAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, fontWeight: 600, fontSize: '0.85rem' }}>
                            <Key size={18} strokeWidth={1.5} style={{ opacity: 0.7 }} /> Attach Secret (Keep)
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
                            {sending ? <CircularProgress size={20} color="inherit" /> : <Send size={20} strokeWidth={1.5} />}
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
                            {isRecording ? <Square size={24} strokeWidth={1.5} /> : <Mic size={24} strokeWidth={1.5} />}
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
            <MasterPassModal 
                open={unlockModalOpen}
                onClose={() => setUnlockModalOpen(false)}
                onSuccess={() => {
                    setIsUnlocked(true);
                    loadMessages();
                    loadConversation();
                }}
            />
        </Box>
    );
};
