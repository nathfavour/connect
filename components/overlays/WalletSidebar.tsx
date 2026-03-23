"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Drawer,
    Stack,
    Button,
    alpha,
    Divider,
    useMediaQuery,
    useTheme,
    CircularProgress,
    Paper,
    Fade
} from '@mui/material';
import {
    X,
    Wallet as WalletIcon,
    ChevronLeft,
    Shield,
    Lock,
    Unlock,
    Copy,
    ExternalLink,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSudo } from '@/context/SudoContext';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { toast } from 'react-hot-toast';

interface WalletSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WalletSidebar = ({ isOpen, onClose }: WalletSidebarProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { requestSudo, isUnlocked } = useSudo();
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    // Desktop: Sidebar (Drawer right)
    // Mobile: Bottom Sheet (Drawer bottom)

    const handleUnlock = () => {
        requestSudo({
            onSuccess: () => {
                toast.success("Wallet Unlocked");
            }
        });
    };

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        toast.success("Address copied");
    };

    const renderWalletContent = () => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                    <Box sx={{ 
                        p: 1, 
                        borderRadius: '12px', 
                        bgcolor: alpha('#6366F1', 0.1),
                        color: '#6366F1',
                        display: 'flex'
                    }}>
                        <WalletIcon size={20} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', letterSpacing: '-0.02em' }}>
                        Kylrix Wallet
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    <X size={20} />
                </IconButton>
            </Stack>

            {!isUnlocked ? (
                <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    textAlign: 'center',
                    px: 2
                }}>
                    <Box sx={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: '20px', 
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.2)'
                    }}>
                        <Lock size={32} />
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
                        Wallet is Locked
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 4, maxWidth: 240 }}>
                        Unlock your secure vault to access your non-custodial wallets and assets.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={handleUnlock}
                        startIcon={<Unlock size={18} />}
                        sx={{
                            bgcolor: '#6366F1',
                            color: '#000',
                            fontWeight: 800,
                            borderRadius: '14px',
                            px: 4,
                            py: 1.5,
                            textTransform: 'none',
                            '&:hover': { bgcolor: alpha('#6366F1', 0.8) }
                        }}
                    >
                        Unlock Wallet
                    </Button>
                </Box>
            ) : (
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {/* Active Wallet Card */}
                    <Paper sx={{ 
                        p: 3, 
                        borderRadius: '24px', 
                        bgcolor: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.1)',
                        mb: 4,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ 
                            position: 'absolute', 
                            top: -20, 
                            right: -20, 
                            width: 100, 
                            height: 100, 
                            bgcolor: alpha('#6366F1', 0.1), 
                            borderRadius: '50%', 
                            filter: 'blur(40px)' 
                        }} />
                        
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Primary Wallet
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, fontFamily: 'var(--font-clash)' }}>
                                    $0.00
                                </Typography>
                            </Box>
                            <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Typography variant="caption" sx={{ fontWeight: 900, color: 'white' }}>SOL</Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" alignItems="center" gap={1} sx={{ 
                            bgcolor: 'rgba(0,0,0,0.2)', 
                            p: 1.5, 
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                        }} onClick={() => handleCopyAddress('HN7c...8xPz')}>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.6)', flex: 1 }}>
                                HN7c...8xPz
                            </Typography>
                            <Copy size={14} color="rgba(255,255,255,0.4)" />
                        </Stack>
                    </Paper>

                    {/* Quick Actions */}
                    <Stack direction="row" gap={2} sx={{ mb: 4 }}>
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            startIcon={<ArrowUpRight size={18} />}
                            sx={{ 
                                borderRadius: '16px', 
                                py: 1.5, 
                                borderColor: 'rgba(255,255,255,0.1)', 
                                color: 'white',
                                fontWeight: 700,
                                textTransform: 'none',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }
                            }}
                        >
                            Send
                        </Button>
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            startIcon={<ArrowDownLeft size={18} />}
                            sx={{ 
                                borderRadius: '16px', 
                                py: 1.5, 
                                borderColor: 'rgba(255,255,255,0.1)', 
                                color: 'white',
                                fontWeight: 700,
                                textTransform: 'none',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }
                            }}
                        >
                            Receive
                        </Button>
                    </Stack>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 3 }} />

                    {/* Assets / History Placeholder */}
                    <Stack gap={2}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Recent Activity
                        </Typography>
                        <Box sx={{ 
                            p: 4, 
                            textAlign: 'center', 
                            borderRadius: '20px', 
                            border: '1px dashed rgba(255,255,255,0.05)',
                            bgcolor: 'rgba(255,255,255,0.01)'
                        }}>
                            <History size={24} color="rgba(255,255,255,0.1)" style={{ marginBottom: 8 }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                No transactions yet
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}

            {/* Footer */}
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', my: 2 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                    T4 Non-Custodial Layer
                </Typography>
                <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.2)' }}>
                    <Settings size={16} />
                </IconButton>
            </Stack>
        </Box>
    );

    if (isMobile) {
        return (
            <Drawer
                anchor="bottom"
                open={isOpen}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        height: isExpanded ? '100%' : '75%',
                        bgcolor: '#0A0908',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: isExpanded ? '0' : '32px 32px 0 0',
                        backgroundImage: 'none',
                        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden'
                    }
                }}
            >
                {/* Drag Handle / Back Button */}
                <Box 
                    sx={{ 
                        width: '100%', 
                        pt: 2, 
                        pb: 1, 
                        display: 'flex', 
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? (
                        <Stack direction="row" alignItems="center" gap={1} sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            <ChevronLeft size={20} />
                            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Back</Typography>
                        </Stack>
                    ) : (
                        <Box sx={{ width: 40, height: 4, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }} />
                    )}
                </Box>
                {renderWalletContent()}
            </Drawer>
        );
    }

    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 400,
                    bgcolor: '#0A0908',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundImage: 'none',
                    boxShadow: '-20px 0 40px rgba(0,0,0,0.8)'
                }
            }}
        >
            {renderWalletContent()}
        </Drawer>
    );
};
