'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    Box,
    Typography,
    IconButton,
    Grid,
    Paper,
    InputBase,
    alpha,
} from '@mui/material';
import {
    Search,
    X,
    Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ECOSYSTEM_APPS, getEcosystemUrl } from '../../lib/constants';
import Logo, { KylrixApp } from './Logo';

interface EcosystemPortalProps {
    open: boolean;
    onClose: () => void;
}

export default function EcosystemPortal({ open, onClose }: EcosystemPortalProps) {
    const [search, setSearch] = useState('');

    const filteredApps = ECOSYSTEM_APPS.filter(app => 
        app.type === 'app' && (
            app.label.toLowerCase().includes(search.toLowerCase()) ||
            app.description.toLowerCase().includes(search.toLowerCase())
        )
    );

    const getCurrentSubdomain = () => {
        if (typeof window === 'undefined') return null;
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            const port = window.location.port;
            const ports: Record<string, string> = {
                '3000': 'accounts',
                '3001': 'note',
                '3002': 'vault',
                '3003': 'flow',
                '3004': 'connect',
                '3005': 'kylrix'
            };
            return ports[port] || null;
        }
        const segments = host.split('.');
        if (segments.length <= 2) return 'kylrix';
        return segments[0];
    };

    const handleAppClick = (subdomain: string) => {
        const currentSubdomain = getCurrentSubdomain();
        if (subdomain === currentSubdomain) {
            onClose();
            return;
        }

        const url = getEcosystemUrl(subdomain);
        window.location.assign(url);
        onClose();
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (open) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, handleKeyDown]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    backgroundImage: 'none',
                    overflow: 'visible'
                }
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <Paper
                    sx={{
                        p: 0,
                        borderRadius: '32px',
                        bgcolor: '#161412',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header / Search */}
                    <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Zap size={24} color="#6366F1" strokeWidth={1.5} />
                            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: 'white' }}>
                                KYLRIX <Box component="span" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>PORTAL</Box>
                            </Typography>
                            <Box sx={{ flexGrow: 1 }} />
                            <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                <X size={20} />
                            </IconButton>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '16px',
                            px: 2,
                            py: 1.5,
                            mt: 2,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            '&:focus-within': {
                                borderColor: 'rgba(99, 102, 241, 0.5)',
                                bgcolor: 'rgba(255, 255, 255, 0.06)'
                            }
                        }}>
                            <Search size={20} color="rgba(255, 255, 255, 0.3)" strokeWidth={1.5} />
                            <InputBase
                                autoFocus
                                placeholder="Jump to app or search..."
                                fullWidth
                                value={search}
                                onChange={(_e) => setSearch(_e.target.value)}
                                sx={{
                                    color: 'white',
                                    fontSize: '1rem',
                                    fontWeight: 500
                                }}
                            />
                            <Box sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: '6px',
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.4)',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                fontFamily: 'monospace'
                            }}>
                                ESC
                            </Box>
                        </Box>
                    </Box>

                    {/* Grid of Apps */}
                    <Box sx={{ p: 3, maxHeight: '60vh', overflow: 'auto' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 2, display: 'block' }}>
                            Available Gateways
                        </Typography>
                        <Grid container spacing={2}>
                            {filteredApps.map((app) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={app.id}>
                                    <Box
                                        component="button"
                                        onClick={() => handleAppClick(app.subdomain)}
                                        sx={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            p: 2,
                                            borderRadius: '20px',
                                            bgcolor: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            color: 'white',
                                            textAlign: 'left',
                                            transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: 'rgba(255, 255, 255, 0.06)',
                                                borderColor: alpha(app.color, 0.4),
                                                transform: 'translateY(-1px)'
                                            },
                                            '&:active': {
                                                transform: 'scale(0.98)'
                                            }
                                        }}
                                    >
                                        <Box sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '14px',
                                            bgcolor: alpha(app.color, 0.08),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${alpha(app.color, 0.24)}`,
                                            overflow: 'hidden'
                                        }}>
                                            <Logo app={app.id as KylrixApp} size={28} variant="icon" />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                {app.label}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', display: 'block' }}>
                                                {app.description}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    {/* Footer */}
                    <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            KYLRIX ECOSYSTEM v1.0
                        </Typography>
                    </Box>
                </Paper>
            </motion.div>
        </Dialog>
    );
}
