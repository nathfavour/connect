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
    useTheme,
    alpha,
    Divider,
    Avatar,
    Typography,
    IconButton
} from '@mui/material';
import { 
    Home, 
    MessageSquare, 
    Phone, 
    User as UserIcon, 
    Settings, 
    LogOut, 
    Sun, 
    Moon 
} from 'lucide-react';
import { useColorMode } from '@/components/providers/ThemeProvider';
import { useAuth } from '@/lib/auth';

const drawerWidth = 280;

export const Navigation = () => {
    const pathname = usePathname();
    const theme = useTheme();
    const colorMode = useColorMode();
    const { user, logout } = useAuth();

    const navItems = [
        { label: 'Home', href: '/', icon: <Home size={20} strokeWidth={1.5} /> },
        { label: 'Chats', href: '/chats', icon: <MessageSquare size={20} strokeWidth={1.5} /> },
        { label: 'Calls', href: '/calls', icon: <Phone size={20} strokeWidth={1.5} /> },
        { label: 'Profile', href: '/profile', icon: <UserIcon size={20} strokeWidth={1.5} /> },
    ];

    return (
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
                    borderRight: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                },
            }}
        >
            <Box sx={{ overflow: 'auto', mt: 2, px: 2, flex: 1 }}>
                <List>
                    {navItems.map((item) => (
                        <ListItem key={item.href} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton 
                                component={Link} 
                                href={item.href}
                                selected={pathname === item.href}
                                sx={{ 
                                    borderRadius: 3, 
                                    py: 1.5,
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        color: 'primary.main',
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                                        '& .MuiListItemIcon-root': { color: 'primary.main' }
                                    },
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.text.primary, 0.04)
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: pathname === item.href ? 'inherit' : 'text.secondary' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText 
                                    primary={item.label} 
                                    primaryTypographyProps={{ fontWeight: pathname === item.href ? 600 : 400 }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        THEME
                    </Typography>
                    <IconButton onClick={colorMode.toggleColorMode} size="small">
                        {theme.palette.mode === 'dark' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
                    </IconButton>
                </Box>

                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.04) }}>
                        <Avatar 
                            sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14, fontWeight: 'bold' }}
                        >
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap fontWeight={600}>
                                {user.name || 'User'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                                {user.email}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => logout()}>
                            <LogOut size={18} strokeWidth={1.5} />
                        </IconButton>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
};
