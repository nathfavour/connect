'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    Avatar,
    Typography,
    Box,
    IconButton,
    Divider,
    Button,
    Stack,
    alpha,
    useTheme,
    useMediaQuery,
    CircularProgress
} from '@mui/material';
import {
    Video,
    Phone,
    Plus,
    Calendar,
    X,
    User,
    Users,
    ChevronRight,
    Search
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatService } from '@/lib/services/chat';
import { useAuth } from '@/lib/auth';
import { UsersService } from '@/lib/services/users';
import { CallService } from '@/lib/services/call';
import toast from 'react-hot-toast';

export const CallActionModal = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
    const { user } = useAuth();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && user) {
            loadConversations();
        }
    }, [open, user]);

    const loadConversations = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await ChatService.getConversations(user.$id);
            // Filter out self-chats/saved messages
            const filtered = res.rows.filter((c: any) => {
                const isSelf = c.type === 'direct' && c.participants && 
                              (c.participants.length === 1 || 
                               (c.participants.length === 2 && c.participants.every((p: string) => p === user.$id)));
                return !isSelf;
            });
            setConversations(filtered);
        } catch (e) {
            console.error('Failed to load individuals:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleStartPublicCall = async () => {
        if (!user) return;
        try {
            const link = await CallService.createCallLink(user.$id, 'video');
            router.push(`/call/${link.code}?caller=true`);
            onClose();
        } catch (e) {
            toast.error("Failed to start public call");
        }
    };

    const handleCallIndividual = (convId: string, type: 'audio' | 'video' = 'video') => {
        router.push(`/call/${convId}?caller=true&type=${type}`);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    bgcolor: '#161412',
                    backgroundImage: 'none',
                    borderRadius: isMobile ? 0 : '24px',
                    border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    maxWidth: '500px',
                    width: '100%'
                }
            }}
        >
            <DialogTitle sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)' }}>New Call</Typography>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    <X size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Stack direction="row" spacing={2}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleStartPublicCall}
                        startIcon={<Plus size={18} />}
                        sx={{ 
                            bgcolor: '#6366F1', 
                            py: 1.5, 
                            borderRadius: '12px', 
                            fontWeight: 800,
                            textTransform: 'none'
                        }}
                    >
                        Public Call
                    </Button>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => toast("Scheduling coming soon")}
                        startIcon={<Calendar size={18} />}
                        sx={{ 
                            borderColor: 'rgba(255,255,255,0.1)', 
                            color: 'white',
                            py: 1.5, 
                            borderRadius: '12px', 
                            fontWeight: 800,
                            textTransform: 'none'
                        }}
                    >
                        Schedule
                    </Button>
                </Stack>

                <Divider sx={{ opacity: 0.05, my: 1 }} />

                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.5, letterSpacing: 1, mb: 1.5, display: 'block' }}>
                        RECENT INDIVIDUALS
                    </Typography>
                    
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={20} /></Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {conversations.map((conv) => (
                                <ListItem key={conv.$id} disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton 
                                        onClick={() => handleCallIndividual(conv.$id)}
                                        sx={{ 
                                            borderRadius: '16px', 
                                            bgcolor: 'rgba(255,255,255,0.02)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: '#0A0908', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                {conv.type === 'group' ? <Users size={20} /> : <User size={20} />}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText 
                                            primary={conv.name} 
                                            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                                        />
                                        <Stack direction="row" spacing={1}>
                                            <IconButton size="small" sx={{ color: '#6366F1', bgcolor: alpha('#6366F1', 0.1) }}>
                                                <Phone size={16} />
                                            </IconButton>
                                            <IconButton size="small" sx={{ color: '#A855F7', bgcolor: alpha('#A855F7', 0.1) }}>
                                                <Video size={16} />
                                            </IconButton>
                                        </Stack>
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};
