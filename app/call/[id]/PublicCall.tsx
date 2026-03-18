'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CallService } from '@/lib/services/call';
import { UsersService } from '@/lib/services/users';
import { useAuth } from '@/lib/auth';
import { CallInterface } from '@/components/call/CallInterface';
import { 
    Box, 
    Container, 
    Paper, 
    Typography, 
    Button, 
    Avatar, 
    alpha, 
    CircularProgress,
    TextField,
    IconButton,
    Stack,
    Badge
} from '@mui/material';
import { 
    Video, 
    Mic, 
    User, 
    ArrowLeft, 
    ShieldAlert, 
    CheckCircle2,
    Users,
    LogIn
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { client, account as authAccount } from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';

export function PublicCall({ id }: { id: string }) {
    const { user, login } = useAuth();
    const router = useRouter();
    const [linkData, setLinkData] = useState<any>(null);
    const [hostProfile, setHostProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [isAdmitted, setIsAdmitted] = useState(false);
    const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'rejected'>('none');
    const [localUser, setLocalUser] = useState<any>(user);

    useEffect(() => {
        setLocalUser(user);
    }, [user]);

    const loadCallDetails = useCallback(async () => {
        try {
            // First try by ID (new way)
            let link = await CallService.getCallLink(id);
            
            // Fallback to code (legacy support)
            if (!link) {
                link = await CallService.getCallLinkByCode(id);
            }

            if (!link) {
                setLoading(false);
                return;
            }
            setLinkData(link);
            
            // Fetch host profile
            const host = await UsersService.getProfileById(link.userId);
            setHostProfile(host);
        } catch (e) {
            console.error('Failed to load call details:', e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadCallDetails();
    }, [loadCallDetails]);

    // Handle signals while in landing state (specifically waiting for 'let_in')
    useEffect(() => {
        if (!localUser || requestStatus !== 'pending') return;

        const unsubscribe = client.subscribe(
            `databases.${APPWRITE_CONFIG.DATABASES.CHAT}.tables.${APPWRITE_CONFIG.TABLES.CHAT.APP_ACTIVITY}.rows`,
            (response: any) => {
                if (response.events.some((e: string) => e.includes('.update'))) {
                    const activity = response.payload;
                    if (!activity.customStatus) return;
                    
                    try {
                        const signal = JSON.parse(activity.customStatus);
                        if (signal.target === localUser.$id && signal.type === 'let_in') {
                            setIsAdmitted(true);
                            setJoining(false);
                            toast.success("Host admitted you to the call!");
                        }
                    } catch (e) {}
                }
            }
        );

        return () => unsubscribe();
    }, [localUser, requestStatus]);

    const handleJoinRequest = async () => {
        if (!displayName.trim() && !localUser) {
            toast.error("Please enter your name");
            return;
        }

        setJoining(true);
        try {
            let activeUser = localUser;
            
            // 1. Create anonymous session if not logged in
            if (!activeUser) {
                await CallService.createAnonymousSession();
                // Fetch the new guest user
                activeUser = await authAccount.get() as any;
                setLocalUser(activeUser);
            }

            // 2. Send join request signal to the host
            await CallService.sendSignal(activeUser.$id, linkData.userId, {
                type: 'join_request',
                senderName: displayName || activeUser.name || 'Guest'
            });

            setRequestStatus('pending');
            toast("Request sent to host. Please wait...", { icon: '⏳' });
        } catch (e) {
            setJoining(false);
            toast.error("Failed to send join request");
        }
    };

    if (loading) return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress sx={{ color: '#6366F1' }} />
        </Box>
    );

    if (!linkData || linkData.isExpired) return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 500, bgcolor: '#161412', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <ShieldAlert size={64} color="#EF4444" style={{ marginBottom: '24px' }} />
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, fontFamily: 'var(--font-clash)' }}>
                    {linkData?.isExpired ? 'Call Ended' : 'Link Not Found'}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', mb: 4 }}>
                    {linkData?.isExpired 
                        ? "This call has expired. Links last for 3 hours. Please ask the host for a new link." 
                        : "This call link is no longer active or never existed. Check with the host for a new link."}
                </Typography>
                <Button 
                    variant="outlined" 
                    startIcon={<ArrowLeft size={18} />} 
                    onClick={() => router.push('/')}
                    sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 3, px: 4 }}
                >
                    Back to Feed
                </Button>
            </Paper>
        </Box>
    );

    // If host or already admitted, show the interface
    if (localUser?.$id === linkData.userId || isAdmitted) {
        return (
            <CallInterface 
                isCaller={localUser?.$id === linkData.userId} 
                callType={linkData.type} 
                targetId={localUser?.$id === linkData.userId ? undefined : linkData.userId}
                callCode={id}
            />
        );
    }

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: '#0A0908', 
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            p: 3 
        }}>
            <Container maxWidth="sm">
                <Paper sx={{ 
                    p: { xs: 4, md: 6 }, 
                    bgcolor: '#161412', 
                    borderRadius: 8, 
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)'
                }}>
                    <Stack spacing={4} alignItems="center" textAlign="center">
                        <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                                <Box sx={{ p: 0.5, bgcolor: '#10B981', borderRadius: '50%', border: '3px solid #161412' }}>
                                    <Video size={14} color="white" />
                                </Box>
                            }
                        >
                            <Avatar 
                                src={hostProfile?.avatar} 
                                sx={{ width: 100, height: 100, border: '3px solid rgba(99, 102, 241, 0.2)' }}
                            >
                                {hostProfile?.displayName?.charAt(0) || <User size={40} />}
                            </Avatar>
                        </Badge>

                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', letterSpacing: '-0.02em', mb: 1 }}>
                                Join Call
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                                Hosted by <span style={{ color: '#6366F1' }}>@{hostProfile?.username || 'user'}</span>
                            </Typography>
                        </Box>

                        {requestStatus === 'none' ? (
                            <Stack spacing={3} sx={{ width: '100%' }}>
                                {!user && (
                                    <TextField
                                        fullWidth
                                        placeholder="What's your name?"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        variant="outlined"
                                        InputProps={{
                                            sx: { 
                                                bgcolor: 'rgba(255,255,255,0.03)', 
                                                borderRadius: 4,
                                                color: 'white',
                                                fontWeight: 800,
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                                            }
                                        }}
                                    />
                                )}
                                
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    onClick={handleJoinRequest}
                                    disabled={joining}
                                    sx={{ 
                                        bgcolor: '#6366F1', 
                                        color: 'white', 
                                        py: 2, 
                                        borderRadius: 4, 
                                        fontWeight: 900,
                                        fontSize: '1.1rem',
                                        textTransform: 'none',
                                        '&:hover': { bgcolor: '#4F46E5' }
                                    }}
                                >
                                    {joining ? <CircularProgress size={24} color="inherit" /> : 'Ask to Join'}
                                </Button>

                                {!user && (
                                    <Button
                                        fullWidth
                                        startIcon={<LogIn size={18} />}
                                        onClick={() => login()}
                                        sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}
                                    >
                                        Sign in for better experience
                                    </Button>
                                )}
                            </Stack>
                        ) : (
                            <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
                                <CircularProgress size={48} sx={{ color: '#6366F1' }} />
                                <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>
                                    Waiting for host...
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', maxWidth: 300 }}>
                                    The host has been notified of your request to join this encrypted P2P session.
                                </Typography>
                            </Stack>
                        )}

                        <Box sx={{ pt: 2, display: 'flex', gap: 3, opacity: 0.3 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Users size={16} />
                                <Typography variant="caption" fontWeight={900}>P2P MESH</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <ShieldAlert size={16} />
                                <Typography variant="caption" fontWeight={900}>ENCRYPTED</Typography>
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
