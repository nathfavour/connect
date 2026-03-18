'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCManager } from '@/lib/webrtc/WebRTCManager';
import { useAuth } from '@/lib/auth';
import { CallService } from '@/lib/services/call';
import { client } from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import { useRouter } from 'next/navigation';
import { 
    Box, 
    IconButton, 
    Typography, 
    Fab, 
    Avatar,
    Tooltip,
    Badge,
    CircularProgress,
    Button,
    Paper,
    alpha
} from '@mui/material';
import {
    PhoneOff,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Users,
    ShieldCheck,
    Lock,
    Unlock,
    Settings,
    Maximize2,
    Minimize2,
    UserPlus,
    UserCheck,
    UserX,
    MessageSquare,
    Monitor,
    Circle,
    Square,
    ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { InCallChat } from './InCallChat';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    attachment?: any;
}

interface JoinRequest {
    senderId: string;
    senderName: string;
}

import { ChatService } from '@/lib/services/chat';

export const CallInterface = ({ 
    conversationId, 
    isCaller, 
    callType = 'video',
    targetId: initialTargetId,
    callCode
}: { 
    conversationId?: string, 
    isCaller: boolean, 
    callType?: 'audio' | 'video',
    targetId?: string,
    callCode?: string
}) => {
    const { user } = useAuth();
    const [status, setStatus] = useState('Initializing...');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
    const [targetId, setTargetId] = useState<string | undefined>(initialTargetId);
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(null);
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const rtcManager = useRef<WebRTCManager | null>(null);
    const router = useRouter();
    const callStartTime = useRef<number>(Date.now());

    const handleDeviceMenuOpen = async (event: React.MouseEvent<HTMLElement>) => {
        const devs = await rtcManager.current?.getDevices();
        if (devs) setDevices(devs);
        setDeviceMenuAnchor(event.currentTarget);
    };

    const handleSwitchDevice = async (kind: 'audioinput' | 'videoinput', deviceId: string) => {
        const stream = await rtcManager.current?.switchDevice(kind, deviceId);
        if (stream && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
        setDeviceMenuAnchor(null);
    };

    const toggleScreenShare = async () => {
        try {
            const stream = await rtcManager.current?.toggleScreenShare(!isScreenSharing);
            setIsScreenSharing(!isScreenSharing);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream || (rtcManager.current as any).localStream;
            }
        } catch (e) {
            console.error('Screen share failed:', e);
            setIsScreenSharing(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            rtcManager.current?.stopRecording();
            toast.success("Recording saved");
        } else {
            rtcManager.current?.startRecording();
            toast.success("Recording started");
        }
        setIsRecording(!isRecording);
    };

    const broadcastMessage = async (content: string, attachment?: any) => {
        if (!user || !targetId) return;
        
        const msg: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            senderId: user.$id,
            senderName: user.name || 'Guest',
            content,
            timestamp: Date.now(),
            attachment
        };

        // Add to local state immediately
        setChatMessages(prev => [...prev, msg]);

        // Broadcast to target
        try {
            await CallService.sendSignal(user.$id, targetId, {
                type: 'chat_message',
                message: msg
            });
        } catch (e) {
            console.error('Failed to broadcast message:', e);
        }
    };

    const initDirectCall = useCallback(async () => {
        if (!user || !conversationId || targetId) return;
        try {
            const conv = await ChatService.getConversationById(conversationId, user.$id);
            const other = conv.participants.find((p: string) => p !== user.$id);
            if (other) {
                setTargetId(other);
                if (isCaller) {
                    rtcManager.current?.createOffer(user.$id, other);
                }
            }
        } catch (e) {
            console.error('Failed to init direct call:', e);
        }
    }, [user, conversationId, targetId, isCaller]);

    useEffect(() => {
        if (conversationId && !targetId) {
            initDirectCall();
        }
    }, [conversationId, targetId, initDirectCall]);

    const cleanupCall = useCallback(async () => {
        if (rtcManager.current) {
            rtcManager.current.cleanup();
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        // 1. Setup WebRTC Manager
        rtcManager.current = new WebRTCManager({
            onTrack: (stream: MediaStream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;
                }
            },
            onStateChange: (state: string) => setStatus(state),
            onSignal: async (signal: any) => {
                if (signal.target) {
                    try {
                        await CallService.sendSignal(user.$id, signal.target, signal);
                    } catch (e) {
                        console.error('Failed to send signal:', e);
                    }
                }
            }
        });

        // 2. Initialize Media
        const initVideo = callType === 'video';
        rtcManager.current.initializeLocalStream(initVideo, true).then((stream) => {
            if (localVideoRef.current && initVideo) {
                localVideoRef.current.srcObject = stream;
            }
            
            // 3. If caller and has target, initiate
            if (isCaller && targetId) {
                rtcManager.current?.createOffer(user.$id, targetId);
            } else if (isCaller && !targetId && !callCode && !conversationId) {
                 setStatus('Waiting for participants...');
            }
        }).catch(err => {
             console.error("Failed to init media stream:", err);
             setStatus('Media Access Error');
             toast.error("Could not access camera/microphone");
        });

        // 4. Subscribe to signals via APP_ACTIVITY (WebSocket Realtime)
        const unsubscribe = client.subscribe(
            `databases.${APPWRITE_CONFIG.DATABASES.CHAT}.tables.${APPWRITE_CONFIG.TABLES.CHAT.APP_ACTIVITY}.rows`,
            (response: any) => {
                if (response.events.some((e: string) => e.includes('.update') || e.includes('.create'))) {
                    const activity = response.payload;
                    if (!activity.customStatus) return;
                    
                    try {
                        const signal = JSON.parse(activity.customStatus);
                        if (signal.target !== user.$id) return;
                        if (Date.now() - signal.ts > 10000) return;

                        if (signal.type === 'join_request') {
                            setJoinRequests(prev => [...prev, { 
                                senderId: signal.sender, 
                                senderName: signal.senderName || 'Guest' 
                            }]);
                            toast(`Join Request from ${signal.senderName || 'Guest'}`, { icon: '👋' });
                        } else if (signal.type === 'let_in') {
                            setStatus('Joining...');
                            setTargetId(signal.sender);
                            rtcManager.current?.createOffer(user.$id, signal.sender);
                        } else if (signal.type === 'chat_message') {
                            setChatMessages(prev => [...prev, signal.message]);
                            if (!isChatOpen) {
                                setUnreadChatCount(c => c + 1);
                                toast(`${signal.message.senderName}: ${signal.message.content.substring(0, 30)}...`, { 
                                    icon: '💬',
                                    style: { borderRadius: '12px', background: '#161412', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                                });
                            }
                        } else {
                            rtcManager.current?.handleSignal(signal);
                        }
                    } catch (e) {}
                }
            }
        );

        return () => {
            unsubscribe();
            cleanupCall();
        };
    }, [user, isCaller, callType, targetId, callCode, cleanupCall, isChatOpen]);

    const handleAcceptRequest = async (request: JoinRequest) => {
        if (!user) return;
        setJoinRequests(prev => prev.filter(r => r.senderId !== request.senderId));
        try {
            await CallService.sendSignal(user.$id, request.senderId, { type: 'let_in' });
            setStatus('Connecting to guest...');
        } catch (e) {
            toast.error("Failed to admit guest");
        }
    };

    const handleRejectRequest = (request: JoinRequest) => {
        setJoinRequests(prev => prev.filter(r => r.senderId !== request.senderId));
    };

    const endCall = () => {
        cleanupCall();
        router.back();
    };

    const toggleMute = () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <Box sx={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            bgcolor: '#0A0908', 
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Main Viewport */}
            <Box sx={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                <Paper 
                    elevation={24}
                    sx={{ 
                        width: '100%', height: '100%', maxWidth: '1200px', maxHeight: '800px',
                        bgcolor: '#161412', borderRadius: '32px', overflow: 'hidden', position: 'relative',
                        border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7)'
                    }}
                >
                    <Box 
                        component="video" ref={remoteVideoRef} autoPlay playsInline 
                        sx={{ 
                            width: '100%', height: '100%', objectFit: 'cover', 
                            display: status === 'connected' && !isVideoOff ? 'block' : 'none',
                            transform: 'scaleX(-1)'
                        }} 
                    />
                    
                    {(status !== 'connected' || status === 'failed') && (
                        <Box sx={{ textAlign: 'center', color: 'white', zIndex: 1 }}>
                            <Avatar sx={{ width: 120, height: 120, mb: 3, mx: 'auto', bgcolor: alpha('#6366F1', 0.1), border: '2px solid #6366F1' }}>
                                <Users size={64} color="#6366F1" />
                            </Avatar>
                            <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', letterSpacing: '-0.02em', mb: 1 }}>
                                {status === 'Initializing...' ? 'Kylrix Connect' : status === 'new' ? 'Connecting...' : status}
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.5, fontWeight: 700 }}>
                                {isCaller && !targetId ? 'Copy the link and share to start' : 'Establishing Secure P2P Mesh...'}
                            </Typography>
                            {status === 'Initializing...' && <CircularProgress size={24} sx={{ mt: 4, color: '#6366F1' }} />}
                        </Box>
                    )}
                </Paper>
                
                <Paper 
                    elevation={12}
                    sx={{ 
                        position: 'absolute', bottom: 40, right: 40, width: { xs: 120, sm: 180 }, height: { xs: 160, sm: 240 }, 
                        bgcolor: '#161412', borderRadius: '24px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1301, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    <Box component="video" ref={localVideoRef} autoPlay playsInline muted sx={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                    {isVideoOff && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.8)' }}>
                            <VideoOff size={32} color="rgba(255,255,255,0.2)" />
                        </Box>
                    )}
                </Paper>

                {joinRequests.length > 0 && (
                    <Box sx={{ position: 'absolute', top: 100, right: 40, width: 300, zIndex: 1305, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {joinRequests.map(req => (
                            <Paper key={req.senderId} sx={{ p: 2, bgcolor: '#161412', border: '1px solid #6366F1', borderRadius: 3 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'white', mb: 1.5 }}>{req.senderName} wants to join</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button fullWidth size="small" variant="contained" onClick={() => handleAcceptRequest(req)} startIcon={<UserCheck size={14} />} sx={{ bgcolor: '#6366F1', fontWeight: 900 }}>Admit</Button>
                                    <Button size="small" variant="outlined" onClick={() => handleRejectRequest(req)} sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}><UserX size={14} /></Button>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                )}

                <Box sx={{ position: 'absolute', top: 40, left: 40, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Paper sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, bgcolor: 'rgba(22,20,18,0.6)', backdropFilter: 'blur(10px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ width: 8, height: 8, bgcolor: status === 'connected' ? '#10B981' : '#F59E0B', borderRadius: '50%', boxShadow: `0 0 10px ${status === 'connected' ? '#10B981' : '#F59E0B'}` }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.05em', color: 'white' }}>{status.toUpperCase()}</Typography>
                    </Paper>
                    <Paper sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, bgcolor: 'rgba(22,20,18,0.6)', backdropFilter: 'blur(10px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <ShieldCheck size={14} color="#6366F1" />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', opacity: 0.8 }}>E2E ENCRYPTED P2P</Typography>
                    </Paper>
                </Box>
            </Box>

            {/* Bottom Controls */}
            <Box sx={{ height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1, sm: 4 }, bgcolor: 'transparent', pb: 4, px: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={isMuted ? "Unmute" : "Mute"}>
                        <IconButton onClick={toggleMute} sx={{ width: 56, height: 56, bgcolor: isMuted ? '#EF4444' : 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: isMuted ? '#DC2626' : 'rgba(255,255,255,0.1)' } }}>
                            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                        </IconButton>
                    </Tooltip>
                    <IconButton onClick={handleDeviceMenuOpen} size="small" sx={{ color: 'rgba(255,255,255,0.3)', mt: -2 }}>
                        <ChevronUp size={16} />
                    </IconButton>
                </Box>

                <Tooltip title={isScreenSharing ? "Stop Sharing" : "Share Screen"}>
                    <IconButton onClick={toggleScreenShare} sx={{ width: 56, height: 56, bgcolor: isScreenSharing ? '#6366F1' : 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Monitor size={22} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="End Call">
                    <Fab onClick={endCall} sx={{ width: 72, height: 72, bgcolor: '#EF4444', color: 'white', '&:hover': { bgcolor: '#DC2626', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}>
                        <PhoneOff size={32} />
                    </Fab>
                </Tooltip>

                <Tooltip title={isVideoOff ? "Start Video" : "Stop Video"}>
                    <IconButton onClick={toggleVideo} sx={{ width: 56, height: 56, bgcolor: isVideoOff ? '#EF4444' : 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: isVideoOff ? '#DC2626' : 'rgba(255,255,255,0.1)' } }}>
                        {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                    </IconButton>
                </Tooltip>

                <Tooltip title={isRecording ? "Stop Recording" : "Record Call"}>
                    <IconButton onClick={toggleRecording} sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.05)', color: isRecording ? '#EF4444' : 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {isRecording ? <Square size={20} /> : <Circle size={20} fill={isRecording ? '#EF4444' : 'none'} />}
                    </IconButton>
                </Tooltip>

                <Tooltip title="Messages">
                    <Badge badgeContent={unreadChatCount} color="primary">
                        <IconButton 
                            onClick={() => {
                                setIsChatOpen(!isChatOpen);
                                setUnreadChatCount(0);
                            }} 
                            sx={{ 
                                width: 56, height: 56,
                                bgcolor: isChatOpen ? '#6366F1' : 'rgba(255,255,255,0.05)', 
                                color: 'white', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                '&:hover': { bgcolor: isChatOpen ? '#4F46E5' : 'rgba(255,255,255,0.1)' } 
                            }}
                        >
                            <MessageSquare size={22} />
                        </IconButton>
                    </Badge>
                </Tooltip>
            </Box>

            <Menu
                anchorEl={deviceMenuAnchor}
                open={Boolean(deviceMenuAnchor)}
                onClose={() => setDeviceMenuAnchor(null)}
                PaperProps={{
                    sx: { bgcolor: '#161412', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, mt: -10 }
                }}
            >
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', opacity: 0.5, fontWeight: 800 }}>AUDIO INPUT</Typography>
                {devices.filter(d => d.kind === 'audioinput').map(d => (
                    <MenuItem key={d.deviceId} onClick={() => handleSwitchDevice('audioinput', d.deviceId)} sx={{ fontSize: '0.8rem', py: 1 }}>
                        <ListItemIcon><Mic size={16} color="white" /></ListItemIcon>
                        <ListItemText primary={d.label || `Microphone ${d.deviceId.slice(0, 5)}`} />
                    </MenuItem>
                ))}
                <Divider sx={{ opacity: 0.1 }} />
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', opacity: 0.5, fontWeight: 800 }}>VIDEO INPUT</Typography>
                {devices.filter(d => d.kind === 'videoinput').map(d => (
                    <MenuItem key={d.deviceId} onClick={() => handleSwitchDevice('videoinput', d.deviceId)} sx={{ fontSize: '0.8rem', py: 1 }}>
                        <ListItemIcon><Video size={16} color="white" /></ListItemIcon>
                        <ListItemText primary={d.label || `Camera ${d.deviceId.slice(0, 5)}`} />
                    </MenuItem>
                ))}
            </Menu>

            <InCallChat 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
                messages={chatMessages}
                onSendMessage={broadcastMessage}
            />
        </Box>
    );
};
