'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Box, 
    Drawer, 
    List, 
    ListItem, 
    ListItemButton, 
    ListItemIcon, 
    ListItemText, 
    Paper,
    BottomNavigation,
    BottomNavigationAction,
} from '@mui/material';

import { 
    MessageCircle, 
    Home, 
    Phone, 
    Settings,
    ArrowLeft
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profile-preview';
import { getUserProfilePicId } from '@/lib/user-utils';
import { useAuth } from '@/lib/auth';

import { AppHeader } from './AppHeader';
import { ChatList } from '../chat/ChatList';
import { Button } from '@mui/material';

const drawerWidth = 280;

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const { user, logout: _logout } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [_anchorEl, _setAnchorEl] = useState<null | HTMLElement>(null);
    const [_profileUrl, setProfileUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const profilePicId = getUserProfilePicId(user);
        const cached = getCachedProfilePreview(profilePicId || undefined);
        if (cached !== undefined && mounted) {
            requestAnimationFrame(() => {
                if (mounted) setProfileUrl(cached ?? null);
            });
        }

        const fetchPreview = async () => {
            try {
                if (profilePicId) {
                    const url = await fetchProfilePreview(profilePicId, 64, 64);
                    if (mounted) setProfileUrl(url as unknown as string);
                } else if (mounted) setProfileUrl(null);
            } catch (_err: unknown) {
                if (mounted) setProfileUrl(null);
            }
        };

        fetchPreview();
        return () => { mounted = false; };
    }, [user]);

    const isEmbedded = useMemo(() => searchParams?.get('is_embedded') === 'true', [searchParams]);
    const isExternalProfile = pathname?.startsWith('/u/');
    const isChatActive = pathname?.startsWith('/chat/') || pathname === '/chats';
    const isInsideChat = pathname?.startsWith('/chat/');

    const navItems = [
        { label: 'Home', icon: <Home size={24} />, href: '/' },
        { label: 'Chats', icon: <MessageCircle size={24} />, href: '/chats' },
        { label: 'Calls', icon: <Phone size={24} />, href: '/calls' },
        // Profile removed from nav — access via account menu -> "Profile"
        { label: 'Settings', icon: <Settings size={24} />, href: '/settings' },
    ];


    if (isEmbedded) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#0A0908', p: 2, overflowY: 'auto' }}>
                <Paper
                    elevation={0}
                    sx={{
                        minHeight: '100%',
                        bgcolor: '#161412',
                        borderRadius: '24px',
                        border: '1px solid',
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        p: 2,
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '1px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '24px',
                        },
                    }}
                >
                    {children}
                </Paper>
            </Box>
        );
    }

    return (
            <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#0A0908' }}>
                <AppHeader />

            {/* Desktop Sidebar */}
            {!isExternalProfile && (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        display: { xs: 'none', md: 'block' },
                        [`& .MuiDrawer-paper`]: { 
                            width: drawerWidth, 
                            boxSizing: 'border-box', 
                            top: 72, 
                            height: 'calc(100% - 72px)',
                            bgcolor: '#0A0908',
                            borderRight: '1px solid',
                            borderColor: 'rgba(255, 255, 255, 0.05)'
                        },
                    }}
                >
                    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {isChatActive ? (
                            <>
                                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <Button 
                                        onClick={() => router.push('/')}
                                        startIcon={<ArrowLeft size={16} />}
                                        fullWidth
                                        sx={{ 
                                            justifyContent: 'flex-start',
                                            color: 'text.secondary',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            borderRadius: '10px',
                                            '&:hover': {
                                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                color: 'white'
                                            }
                                        }}
                                    >
                                        Back to Menu
                                    </Button>
                                </Box>
                                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                    <ChatList />
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ overflow: 'auto', mt: 2, px: 2 }}>
                                <List sx={{ gap: 1, display: 'flex', flexDirection: 'column' }}>
                                    {navItems.map((item) => (
                                        <ListItem key={item.href} disablePadding>
                                            <ListItemButton 
                                                component={Link} 
                                                href={item.href}
                                                selected={pathname === item.href}
                                                sx={{ 
                                                    borderRadius: '12px', 
                                                    transition: 'all 0.2s ease',
                                                    '&.Mui-selected': {
                                                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                                                        color: '#6366F1',
                                                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.15)' },
                                                        '& .MuiListItemIcon-root': { color: '#6366F1' }
                                                    },
                                                    '&:hover': {
                                                        bgcolor: 'rgba(255, 255, 255, 0.05)'
                                                    }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 40, color: pathname === item.href ? '#6366F1' : 'text.secondary' }}>
                                                    {item.icon}
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={item.label} 
                                                    primaryTypographyProps={{ 
                                                        fontWeight: pathname === item.href ? 700 : 500,
                                                        fontSize: '0.9rem'
                                                    }} 
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}
                    </Box>
                </Drawer>
            )}

            {/* Main Content */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    height: '100%', 
                    overflow: 'hidden', 
                    position: 'relative', 
                    pt: '72px',
                    bgcolor: '#0A0908',
                    transition: 'all 0.3s ease-in-out'
                }}
            >
                <Box sx={{ 
                    height: '100%', 
                    p: isInsideChat ? 0 : { xs: 2, md: 3 },
                    overflowY: isInsideChat ? 'hidden' : 'auto',
                    maxWidth: isExternalProfile ? '1200px' : 'auto',
                    mx: isExternalProfile ? 'auto' : 'unset'
                }}>

                    <Paper
                        elevation={0}
                        sx={{
                            height: isInsideChat ? '100%' : 'auto',
                            minHeight: '100%',
                            bgcolor: isInsideChat ? 'transparent' : '#161412',
                            borderRadius: isInsideChat ? 0 : '24px',
                            border: isInsideChat ? 'none' : '1px solid',
                            borderColor: 'rgba(255, 255, 255, 0.05)',
                            p: isInsideChat ? 0 : { xs: 2, md: 4 },
                            position: 'relative',
                            display: isInsideChat ? 'flex' : 'block',
                            flexDirection: 'column',
                            '&::before': {
                                content: isInsideChat ? 'none' : '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '1px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '24px',
                            },
                        }}
                    >
                        {children}
                    </Paper>
                </Box>
            </Box>

            {/* Mobile Bottom Nav */}
            {!isInsideChat && (
                <Paper 
                    elevation={0}
                    sx={{ 
                        position: 'fixed', 
                        bottom: 24, 
                        left: 24, 
                        right: 24, 
                        display: { xs: 'block', md: 'none' },
                        borderRadius: '20px', 
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        bgcolor: 'rgba(22, 20, 18, 0.8)',
                        backdropFilter: 'blur(20px)',
                        zIndex: 1000
                    }} 
                >
                    <BottomNavigation
                        value={pathname}
                        sx={{ bgcolor: 'transparent', height: 72 }}
                    >
                        {navItems.map((item) => (
                            <BottomNavigationAction
                                key={item.href}
                                icon={item.icon}
                                component={Link}
                                href={item.href}
                                value={item.href}
                                sx={{ 
                                    color: 'text.secondary',
                                    minWidth: 0,
                                    padding: '12px 0',
                                    '&.Mui-selected': { 
                                        color: '#6366F1'
                                    }
                                }}
                            />
                        ))}
                    </BottomNavigation>
                </Paper>
            )}
        </Box>
    );
};
