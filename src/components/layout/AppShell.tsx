'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter  } from 'next/navigation';
import { 
    Box, 
    Drawer, 
    List, 
    ListItem, 
    ListItemButton, 
    ListItemIcon, 
    ListItemText, 
    Paper,
    IconButton,
    BottomNavigation as _BottomNavigation,
    BottomNavigationAction as _BottomNavigationAction, Button 
} from '@mui/material';

import { 
    MessageCircle, 
    Home, 
    Phone, 
    Settings,
    ArrowLeft
} from 'lucide-react';

import { AppHeader } from './AppHeader';
import { ChatList } from '../chat/ChatList';
import { ProfileSetupDrawer } from '../profile/ProfileSetupDrawer';
import { useAppChrome } from '@/components/providers/AppChromeProvider';

const drawerWidth = 280;

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [_anchorEl, _setAnchorEl] = useState<null | HTMLElement>(null);
    const [_bottomNavOffset, _setBottomNavOffset] = useState(0);
    const { headerHeight } = useAppChrome();

    const isEmbedded = useMemo(() => searchParams?.get('is_embedded') === 'true', [searchParams]);
    const isExternalProfile = pathname?.startsWith('/u/');
    const isChatActive = pathname?.startsWith('/chat/') || pathname === '/chats';
    const isPostActive = pathname?.startsWith('/post/');
    const isInsideChat = pathname?.startsWith('/chat/');
    const isFullscreenContent = isChatActive || isPostActive;

    useEffect(() => {
        const updateBottomNavOffset = () => {
            if (typeof window === 'undefined') return;
            const viewport = window.visualViewport;
            if (!viewport) {
                setBottomNavOffset(0);
                return;
            }

            const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
            setBottomNavOffset(offset);
        };

        updateBottomNavOffset();

        const viewport = window.visualViewport;
        if (!viewport) return;

        viewport.addEventListener('resize', updateBottomNavOffset);
        viewport.addEventListener('scroll', updateBottomNavOffset);
        window.addEventListener('resize', updateBottomNavOffset);

        return () => {
            viewport.removeEventListener('resize', updateBottomNavOffset);
            viewport.removeEventListener('scroll', updateBottomNavOffset);
            window.removeEventListener('resize', updateBottomNavOffset);
        };
    }, []);

    const navItems = [
        { label: 'Home', icon: <Home size={24} />, href: '/' },
        { label: 'Chats', icon: <MessageCircle size={24} />, href: '/chats' },
        { label: 'Calls', icon: <Phone size={24} />, href: '/calls' },
        // Profile removed from nav — access via account menu -> "Profile"
        { label: 'Settings', icon: <Settings size={24} />, href: '/settings' },
    ];


    if (isEmbedded) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#000000', p: 2, overflowY: 'auto' }}>
                <Paper
                    elevation={0}
                    sx={{
                        minHeight: '100%',
                        bgcolor: '#000000',
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
            <Box sx={{ display: 'flex', height: '100dvh', minHeight: '100dvh', overflow: 'hidden', bgcolor: '#000000' }}>
                {!isFullscreenContent && <AppHeader />}
                <ProfileSetupDrawer />

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
                            top: isFullscreenContent ? 0 : headerHeight, 
                            height: isFullscreenContent ? '100%' : `calc(100% - ${headerHeight}px)`,
                             bgcolor: '#000000',
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
                    pt: isFullscreenContent ? 0 : `${headerHeight}px`,
                    bgcolor: '#000000',
                    transition: 'all 0.3s ease-in-out'
                }}
            >
                    <Box sx={{ 
                      height: '100%', 
                       p: (isInsideChat || isPostActive) ? 0 : { xs: 2, md: 3 },
                       pb: isFullscreenContent ? 0 : { xs: 10, md: 3 },
                        overflowY: (isInsideChat || isPostActive) ? 'hidden' : 'auto',
                        overscrollBehaviorY: isPostActive ? 'contain' : 'auto',
                        maxWidth: isExternalProfile ? '1200px' : 'auto',
                        mx: isExternalProfile ? 'auto' : 'unset'
                   }}>

                    <Paper
                        elevation={0}
                        sx={{
                            height: (isInsideChat || isPostActive) ? '100%' : 'auto',
                            minHeight: '100%',
                             bgcolor: (isInsideChat || isPostActive) ? 'transparent' : '#000000',
                            borderRadius: (isInsideChat || isPostActive) ? 0 : '24px',
                            border: (isInsideChat || isPostActive) ? 'none' : '1px solid',
                            borderColor: 'rgba(255, 255, 255, 0.05)',
                            p: (isInsideChat || isPostActive) ? 0 : { xs: 2, md: 4 },
                            position: 'relative',
                            display: (isInsideChat || isPostActive) ? 'flex' : 'block',
                            flexDirection: 'column',
                            '&::before': {
                                content: (isInsideChat || isPostActive) ? 'none' : '""',
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

            {/* Mobile Bottom Navigation - Kylrix Unified Style */}
            {!isFullscreenContent && (
                <Box
                    component="footer"
                    sx={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1300,
                        display: { xs: 'block', md: 'none' }
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            width: '100%',
                            bgcolor: '#161412',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderBottom: 0,
                            borderRadius: '24px 24px 0 0',
                            px: 2,
                            pt: 1.5,
                            pb: 'calc(1.5rem + env(safe-area-inset-bottom))',
                            display: 'flex',
                            justifyContent: 'space-around',
                            alignItems: 'center',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 -12px 32px rgba(0,0,0,0.45)',
                            backgroundImage: 'none'
                        }}
                    >
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <IconButton
                                    key={item.href}
                                    component={Link}
                                    href={item.href}
                                    sx={{
                                        color: isActive ? '#000' : 'rgba(255, 255, 255, 0.6)',
                                        bgcolor: isActive ? '#F59E0B' : 'transparent',
                                        borderRadius: '16px',
                                        p: 1.5,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            bgcolor: isActive ? '#F59E0B' : 'rgba(255, 255, 255, 0.05)',
                                            transform: 'translateY(-2px)'
                                        },
                                        ...(isActive && {
                                            boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
                                            transform: 'translateY(-4px)'
                                        })
                                    }}
                                >
                                    {item.icon}
                                </IconButton>
                            );
                        })}
                    </Paper>
                </Box>
            )}
        </Box>
    );
};
