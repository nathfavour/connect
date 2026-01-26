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
import ChatIcon from '@mui/icons-material/Chat';
import HomeIcon from '@mui/icons-material/Home';
import CallIcon from '@mui/icons-material/Call';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
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
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';

const drawerWidth = 280;

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const theme = useTheme();
    const colorMode = useColorMode();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
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

    const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const isEmbedded = useMemo(() => searchParams?.get('is_embedded') === 'true', [searchParams]);
    const isProfilePage = pathname === '/profile' || pathname?.startsWith('/u/');

    const navItems = [
        { label: 'Home', href: '/', icon: <HomeIcon /> },
        { label: 'Chats', href: '/chats', icon: <ChatIcon /> },
        { label: 'Calls', href: '/calls', icon: <CallIcon /> },
        { label: 'Profile', href: '/profile', icon: <PersonIcon /> },
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push('/');
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#000000' }}>
            {/* Top Bar (AppBar) */}
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid',
                    borderColor: 'rgba(255, 255, 255, 0.08)'
                }} 
                elevation={0}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Typography 
                        variant="h6" 
                        noWrap 
                        component="div" 
                        onClick={() => router.push('/')}
                        sx={{ 
                            fontWeight: 800, 
                            color: '#00F0FF',
                            fontFamily: 'var(--font-space-grotesk)',
                            letterSpacing: '-0.02em',
                            cursor: 'pointer'
                        }}
                    >
                        WhisperrConnect
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Search */}
                        <Box
                            component="form"
                            onSubmit={handleSearch}
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                width: isMobile ? 150 : 300,
                                bgcolor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid',
                                borderColor: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                px: 1.5,
                                transition: 'all 0.2s ease',
                                '&:hover': { 
                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                    borderColor: 'rgba(255, 255, 255, 0.2)'
                                }
                            }}
                        >
                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <InputBase
                                sx={{ ml: 1, flex: 1, color: 'text.primary', fontSize: '0.875rem' }}
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </Box>

                        <IconButton onClick={colorMode.toggleColorMode} sx={{ color: 'text.secondary' }}>
                            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                        </IconButton>

                        <IconButton onClick={handleProfileClick} sx={{ 
                            p: 0.5,
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            '&:hover': { borderColor: 'rgba(0, 240, 255, 0.2)', bgcolor: 'rgba(255, 255, 255, 0.05)' }
                        }}>
                            <Avatar
                                src={profileUrl || undefined}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '10px',
                                    bgcolor: '#0A0A0A',
                                    color: '#00F0FF',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                }}
                            >
                                {user?.name ? user.name[0].toUpperCase() : 'U'}
                            </Avatar>
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                    sx: {
                        mt: 1.5,
                        minWidth: 240,
                        bgcolor: 'rgba(10, 10, 10, 0.95)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '20px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                        backgroundImage: 'none',
                        color: 'white'
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {user && (
                    <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                            src={profileUrl || undefined}
                            sx={{ 
                                width: 40, 
                                height: 40, 
                                bgcolor: 'rgba(0, 240, 255, 0.1)',
                                color: 'primary.main',
                                borderRadius: '12px',
                                fontWeight: 900
                            }}
                        >
                            {user.name ? user.name[0].toUpperCase() : 'U'}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: 'white' }}>
                                {user.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.email}
                            </Typography>
                        </Box>
                    </Box>
                )}
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
                <MenuItem 
                    onClick={() => {
                        handleCloseMenu();
                        const domain = process.env.NEXT_PUBLIC_DOMAIN || 'whisperrnote.space';
                        const authSub = process.env.NEXT_PUBLIC_AUTH_SUBDOMAIN || 'accounts';
                        window.location.href = `https://${authSub}.${domain}/settings?source=${encodeURIComponent(window.location.origin)}`;
                    }}
                    sx={{ py: 1.5, px: 2.5, gap: 1.5 }}
                >
                    <SettingsIcon sx={{ fontSize: 18, color: "rgba(255, 255, 255, 0.6)" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Settings</Typography>
                </MenuItem>
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
                <MenuItem
                    onClick={async () => {
                        handleCloseMenu();
                        await logout();
                    }}
                    sx={{ py: 1.5, px: 2.5, gap: 1.5, color: '#FF4D4D' }}
                >
                    <LogoutIcon sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Logout</Typography>
                </MenuItem>
            </Menu>

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
                            top: 64, 
                            height: 'calc(100% - 64px)',
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
                    pt: '64px',
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
