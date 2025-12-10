'use client';

import React, { useEffect, useState } from 'react';
import { CallService } from '@/lib/services/calls';
import { UsersService } from '@/lib/services/users';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { 
    Box, 
    Typography, 
    List, 
    ListItem, 
    ListItemAvatar, 
    Avatar, 
    ListItemText, 
    IconButton, 
    Paper,
    CircularProgress,
    Chip,
    Fab
} from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallMissedIcon from '@mui/icons-material/CallMissed';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import AddIcCallIcon from '@mui/icons-material/AddIcCall';

export const CallHistory = () => {
    const { user } = useAuth();
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (user) {
            loadCalls();
        }
    }, [user]);

    const loadCalls = async () => {
        try {
            const history = await CallService.getCallHistory(user!.$id);
            
            const enriched = await Promise.all(history.map(async (call: any) => {
                const isCaller = call.callerId === user!.$id;
                const otherId = isCaller ? call.receiverId : call.callerId;
                
                try {
                    const profile = await UsersService.getProfileById(otherId);
                    return {
                        ...call,
                        otherUser: profile || { username: 'Unknown', $id: otherId },
                        direction: isCaller ? 'outgoing' : 'incoming'
                    };
                } catch (e) {
                    return { ...call, otherUser: { username: 'Unknown', $id: otherId }, direction: isCaller ? 'outgoing' : 'incoming' };
                }
            }));
            
            setCalls(enriched);
        } catch (error) {
            console.error('Failed to load call history:', error);
        } finally {
            setLoading(false);
        }
    };

    const startCall = (userId: string) => {
        alert("Please go to the chat with this user to start a call.");
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', minHeight: '50vh' }}>
            {calls.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                    <CallIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                    <Typography>No recent calls</Typography>
                </Box>
            ) : (
                <List>
                    {calls.map((call) => (
                        <Paper key={call.$id} sx={{ mb: 1.5, borderRadius: 3 }} elevation={0} variant="outlined">
                            <ListItem
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => startCall(call.otherUser.$id)} color="primary">
                                        <CallIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: call.status === 'missed' ? 'error.light' : 'primary.light', color: call.status === 'missed' ? 'error.main' : 'primary.main' }}>
                                        {call.type === 'video' ? <VideocamIcon /> : <CallIcon />}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography fontWeight="bold">
                                            {call.otherUser.displayName || call.otherUser.username}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            {call.direction === 'outgoing' ? <CallMadeIcon fontSize="small" /> : <CallReceivedIcon fontSize="small" />}
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(call.startedAt).toLocaleDateString()}
                                            </Typography>
                                            {call.status === 'missed' && (
                                                <Chip label="Missed" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>
                        </Paper>
                    ))}
                </List>
            )}
            
            <Fab 
                color="primary" 
                aria-label="add call" 
                sx={{ position: 'fixed', bottom: 80, right: 24 }}
                onClick={() => router.push('/chats')}
            >
                <AddIcCallIcon />
            </Fab>
        </Box>
    );
};
