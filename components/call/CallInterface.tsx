'use client';

import React, { useEffect, useRef, useState } from 'react';
import { WebRTCManager } from '@/lib/webrtc/WebRTCManager';
import { useAuth } from '@/lib/auth';
import { ChatService } from '@/lib/services/chat';
import { client } from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import { useRouter } from 'next/navigation';
import { Box, IconButton, Typography, Fab } from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';

export const CallInterface = ({ conversationId, isCaller }: { conversationId: string, isCaller: boolean }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState('Initializing...');
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const rtcManager = useRef<WebRTCManager | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        rtcManager.current = new WebRTCManager({
            onTrack: (stream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;
                }
            },
            onData: (data) => console.log('Data received:', data),
            onStateChange: (state) => setStatus(state),
            onSignal: async (signal) => {
                await ChatService.sendMessage(
                    conversationId,
                    user.$id,
                    JSON.stringify(signal),
                    'call_signal'
                );
            }
        });

        rtcManager.current.initializeLocalStream(true, true).then((stream) => {
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            if (isCaller) {
                ChatService.getConversations(user.$id).then(res => {
                    const conv = res.rows.find((c: any) => c.$id === conversationId);
                    if (conv) {
                        const otherId = conv.participants.find((p: string) => p !== user.$id);
                        if (otherId) {
                            rtcManager.current?.createOffer(user.$id, otherId);
                        }
                    }
                });
            }
        });

        const unsubscribe = client.subscribe(
            `databases.${APPWRITE_CONFIG.DATABASES.CHAT}.tables.${APPWRITE_CONFIG.TABLES.CHAT.MESSAGES}.rows`,
            (response: any) => {
                if (response.events.includes('databases.*.tables.*.rows.*.create')) {
                    const msg = response.payload;
                    if (msg.conversationId === conversationId && msg.type === 'call_signal' && msg.senderId !== user.$id) {
                        try {
                            const signal = JSON.parse(msg.content);
                            if (signal.target === user.$id) {
                                rtcManager.current?.handleSignal(signal);
                            }
                        } catch (e) {
                            console.error('Failed to parse signal:', e);
                        }
                    }
                }
            }
        );

        return () => {
            unsubscribe();
            rtcManager.current?.cleanup();
        };
    }, [user, conversationId, isCaller]);

    const endCall = () => {
        rtcManager.current?.cleanup();
        router.back();
    };

    return (
        <Box sx={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            bgcolor: 'black', 
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Box sx={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {/* Remote Video */}
                <Box 
                    component="video"
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'connected' ? 'block' : 'none' }} 
                />
                
                {/* Placeholder when not connected */}
                {status !== 'connected' && (
                    <Box sx={{ textAlign: 'center', color: 'white' }}>
                        <Typography variant="h5" gutterBottom>
                            {status === 'Initializing...' ? 'Setting up call...' : status}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            Waiting for remote video...
                        </Typography>
                    </Box>
                )}
                
                {/* Local Video */}
                <Box sx={{ 
                    position: 'absolute', 
                    bottom: 100, 
                    right: 20, 
                    width: 120, 
                    height: 160, 
                    bgcolor: 'grey.900',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid white',
                    boxShadow: 3,
                    zIndex: 1301
                }}>
                    <Box 
                        component="video"
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                </Box>

                {/* Status Overlay */}
                <Box sx={{
                    position: 'absolute',
                    top: 40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 4
                }}>
                    <Typography variant="body2">{status}</Typography>
                </Box>
            </Box>

            {/* Controls */}
            <Box sx={{ 
                height: 100, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: 2,
                bgcolor: 'rgba(0,0,0,0.8)'
            }}>
                <Fab color="error" onClick={endCall} aria-label="end call">
                    <CallEndIcon />
                </Fab>
            </Box>
        </Box>
    );
};
