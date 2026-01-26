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
    Typography, 
    useMediaQuery, 
    useTheme,
    Paper,
    BottomNavigation,
    BottomNavigationAction,
    AppBar,
    Toolbar,
    IconButton,
    InputBase,
    alpha
} from '@mui/material';
import { 
    MessageSquare, 
    Home, 
    Phone, 
    User, 
    Search, 
    Settings, 
    LogOut,
    Activity
} from 'lucide-react';
import { useColorMode } from '@/components/providers/ThemeProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { fetchProfilePreview, getCachedProfilePreview } from '@/lib/profile-preview';
import { getUserProfilePicId } from '@/lib/user-utils';
import { useAuth } from '@/lib/auth';
import { UsersService } from '@/lib/services/users';
import {
    Avatar,
    Menu,
    MenuItem,
    Divider,
    Stack
} from '@mui/material';

import { AppHeader } from './AppHeader';

const drawerWidth = 280;

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const theme = useTheme();
    const colorMode = useColorMode();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [profileUrl, setProfileUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const profilePicId = getUserProfilePicId(user);
        const cached = getCachedProfilePreview(profilePicId || undefined);
        if (cached !== undefined && mounted) {
            setProfileUrl(cached ?? null);
        }

        const fetchPreview = async () => {
            try {
                if (profilePicId) {
                    const url = await fetchProfilePreview(profilePicId, 64, 64);
                    if (mounted) setProfileUrl(url as unknown as string);
                } else if (mounted) setProfileUrl(null);
            } catch (err) {
                if (mounted) setProfileUrl(null);
            }
        };

        fetchPreview();
        return () => { mounted = false; };
    }, [user]);

    const isEmbedded = useMemo(() => searchParams?.get('is_embedded') === 'true', [searchParams]);
    const isProfilePage = pathname === '/profile' || pathname?.startsWith('/u/');

    const navItems = [
        { label: 'Home', href: '/', icon: <Home size={20} strokeWidth={1.5} /> },
        { label: 'Chats', href: '/chats', icon: <MessageSquare size={20} strokeWidth={1.5} /> },
        { label: 'Calls', href: '/calls', icon: <Phone size={20} strokeWidth={1.5} /> },
        { label: 'Profile', href: '/profile', icon: <User size={20} strokeWidth={1.5} /> },
    ];

    if (isEmbedded) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#000', p: 2, overflowY: 'auto' }}>
                <Paper
                    elevation={0}
                    sx={{
                        minHeight: '100%',
                        bgcolor: 'rgba(10, 10, 10, 0.7)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        borderRadius: '24px',
                        border: '1px solid',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        p: 2
                    }}
                >
                    {children}
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#000000' }}>
            <AppHeader />

            {/* Desktop Sidebar */}
            {!isMobile && !isProfilePage && (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: { 
                            width: drawerWidth, 
                            boxSizing: 'border-box', 
                            top: 72, 
                            height: 'calc(100% - 72px)',
                            bgcolor: '#000000',
                            borderRight: '1px solid',
                            borderColor: 'rgba(255, 255, 255, 0.08)'
                        },
                    }}
                >
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
                                                bgcolor: 'rgba(0, 240, 255, 0.1)',
                                                color: '#00F0FF',
                                                '&:hover': { bgcolor: 'rgba(0, 240, 255, 0.15)' },
                                                '& .MuiListItemIcon-root': { color: '#00F0FF' }
                                            },
                                            '&:hover': {
                                                bgcolor: 'rgba(255, 255, 255, 0.05)'
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40, color: pathname === item.href ? '#00F0FF' : 'text.secondary' }}>
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
                    bgcolor: '#000000',
                    transition: 'all 0.3s ease-in-out'
                }}
            >
                <Box sx={{ 
                    height: '100%', 
                    p: { xs: 2, md: 3 },
                    overflowY: 'auto',
                    maxWidth: isProfilePage ? '1200px' : 'auto',
                    mx: isProfilePage ? 'auto' : 'unset'
                }}>

                    <Paper
                        elevation={0}
                        sx={{
                            minHeight: '100%',
                            bgcolor: 'rgba(10, 10, 10, 0.7)',
                            backdropFilter: 'blur(20px) saturate(180%)',
                            borderRadius: '24px',
                            border: '1px solid',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            p: { xs: 2, md: 4 }
                        }}
                    >
                        {children}
                    </Paper>
                </Box>
            </Box>

            {/* Mobile Bottom Nav */}
            {isMobile && (
                <Paper 
                    elevation={0}
                    sx={{ 
                        position: 'fixed', 
                        bottom: 24, 
                        left: 24, 
                        right: 24, 
                        borderRadius: '20px', 
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        bgcolor: 'rgba(10, 10, 10, 0.8)',
                        backdropFilter: 'blur(20px)',
                        zIndex: 1000
                    }} 
                >
                    <BottomNavigation
                        showLabels
                        value={pathname}
                        sx={{ bgcolor: 'transparent', height: 72 }}
                    >
                        {navItems.map((item) => (
                            <BottomNavigationAction
                                key={item.href}
                                label={item.label}
                                icon={item.icon}
                                component={Link}
                                href={item.href}
                                value={item.href}
                                sx={{ 
                                    color: 'text.secondary',
                                    '&.Mui-selected': { 
                                        color: '#00F0FF',
                                        '& .MuiBottomNavigationAction-label': {
                                            fontWeight: 700,
                                            fontSize: '0.75rem'
                                        }
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
