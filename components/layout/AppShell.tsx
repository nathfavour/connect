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
import CallIcon from '@mui/icons-material/Call';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useColorMode } from '@/components/providers/ThemeProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const drawerWidth = 280;

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const theme = useTheme();
    const colorMode = useColorMode();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const navItems = [
        { label: 'Chats', href: '/', icon: <ChatIcon /> },
        { label: 'Calls', href: '/calls', icon: <CallIcon /> },
        { label: 'Profile', href: '/profile', icon: <PersonIcon /> },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // We can navigate to a search page or just use the query
            // For now, let's assume the home page handles search if we pass a query param
            // Or better, let's just focus the search input on the home page if we are there.
            // But the user asked for a "simple application search bar".
            // Let's make this global search bar redirect to home with a search param?
            // Or maybe just keep it simple and let the page handle it.
            // Actually, the UserSearch component is on the home page.
            // Let's just navigate to home.
            router.push('/');
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
            {/* Top Bar (AppBar) */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} elevation={0} color="inherit" variant="outlined">
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'primary.main' }}>
                        WhisperrConnect
                    </Typography>
                    
                    {/* Search */}
                    <Paper
                        component="form"
                        onSubmit={handleSearch}
                        sx={{ 
                            p: '2px 4px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            width: isMobile ? 150 : 300,
                            mr: 2,
                            bgcolor: alpha(theme.palette.common.white, 0.15),
                            '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.25) },
                            borderRadius: 2
                        }}
                        variant="outlined"
                    >
                        <InputBase
                            sx={{ ml: 1, flex: 1 }}
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
                            <SearchIcon />
                        </IconButton>
                    </Paper>

                    <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
                        {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Desktop Sidebar */}
            {!isMobile && (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', top: 64, height: 'calc(100% - 64px)' },
                    }}
                >
                    <Box sx={{ overflow: 'auto', mt: 2 }}>
                        <List>
                            {navItems.map((item) => (
                                <ListItem key={item.href} disablePadding>
                                    <ListItemButton 
                                        component={Link} 
                                        href={item.href}
                                        selected={pathname === item.href}
                                        sx={{ 
                                            borderRadius: 2, 
                                            mx: 1, 
                                            mb: 0.5,
                                            '&.Mui-selected': {
                                                bgcolor: 'primary.light',
                                                color: 'primary.contrastText',
                                                '&:hover': { bgcolor: 'primary.main' },
                                                '& .MuiListItemIcon-root': { color: 'inherit' }
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40, color: pathname === item.href ? 'inherit' : 'text.secondary' }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText primary={item.label} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Drawer>
            )}

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, height: '100%', overflow: 'hidden', position: 'relative', pt: '64px' }}>
                {children}
            </Box>

            {/* Mobile Bottom Nav */}
            {isMobile && (
                <Paper 
                    sx={{ 
                        position: 'fixed', 
                        bottom: 16, 
                        left: 16, 
                        right: 16, 
                        borderRadius: 4, 
                        overflow: 'hidden',
                        boxShadow: 3,
                        zIndex: 1000
                    }} 
                    elevation={3}
                >
                    <BottomNavigation
                        showLabels
                        value={pathname}
                        sx={{ bgcolor: 'background.paper' }}
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
                                    '&.Mui-selected': { color: 'primary.main' }
                                }}
                            />
                        ))}
                    </BottomNavigation>
                </Paper>
            )}
        </Box>
    );
};
