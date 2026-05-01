'use client';

import React, { useState, useEffect } from 'react';
import {
    List,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Typography,
    Box,
    CircularProgress,
    TextField,
    Tabs,
    Tab,
    InputAdornment,
    Drawer,
    IconButton,
    Divider
} from '@mui/material';
import KeyIcon from '@mui/icons-material/VpnKeyOutlined';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { EcosystemService } from '@/lib/services/ecosystem';
import { useAuth } from '@/lib/auth';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { SudoModal } from '../overlays/SudoModal';
import { generateSync } from 'otplib';
import toast from 'react-hot-toast';

interface SecretSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (item: any, type: 'secret' | 'totp') => void;
    isSelf: boolean;
}

export const SecretSelectorModal = ({ open, onClose, onSelect, isSelf }: SecretSelectorModalProps) => {
    const { user } = useAuth();
    const [tab, setTab] = useState(0);
    const [secrets, setSecrets] = useState<any[]>([]);
    const [totps, setTotps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [pendingSelection, setPendingSelection] = useState<{ item: any, type: 'secret' | 'totp' } | null>(null);
    const loadData = React.useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [secretsRes, totpsRes] = await Promise.all([
                EcosystemService.listSecrets(user.$id),
                EcosystemService.listTotpSecrets(user.$id)
            ]);
            setSecrets(secretsRes.rows);
            setTotps(totpsRes.rows);
        } catch (error: unknown) {
            console.error('Failed to load ecosystem data:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (open && user) {
            loadData();
        }
    }, [open, user, loadData]);

    const handleSelect = async (item: any, type: 'secret' | 'totp') => {
        if (type === 'secret' && !isSelf) {
            // Restrictions: Can only share secrets to self for now
            toast.error("Secrets can only be shared in your self-chat.");
            return;
        }

        if (!ecosystemSecurity.status.isUnlocked) {
            setPendingSelection({ item, type });
            setUnlockModalOpen(true);
            return;
        }

        try {
            if (type === 'totp') {
                // Decrypt and generate code
                const decryptedSecret = await ecosystemSecurity.decrypt(item.secretKey);
                const code = generateSync({ secret: decryptedSecret.replace(/\s+/g, '').toUpperCase() });
                onSelect({ ...item, currentCode: code }, 'totp');
            } else {
                onSelect(item, 'secret');
            }
            onClose();
        } catch (error: unknown) {
            console.error('Failed to process selection:', error);
        }
    };

    const _filteredItems = tab === 0
        ? secrets.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : totps.filter(t => (t.issuer || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '24px 24px 0 0', bgcolor: 'rgba(15, 15, 15, 0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -24px 60px rgba(0,0,0,0.6)', maxHeight: { xs: '88dvh', sm: '72vh' } } }}>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '72vh', minHeight: 0, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'white', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>Attach Secret</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pick from Vault</Typography>
                        </Box>
                        <IconButton onClick={onClose} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.55)' }}><CloseIcon /></IconButton>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40, '& .MuiTabs-indicator': { backgroundColor: '#6366F1' } }}>
                        <Tab label="Credentials" sx={{ fontWeight: 700, fontSize: '0.8rem' }} />
                        <Tab label="TOTP" sx={{ fontWeight: 700, fontSize: '0.8rem' }} />
                    </Tabs>
                    <TextField fullWidth size="small" placeholder={`Search ${tab === 0 ? 'credentials' : 'TOTP'}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} variant="filled" InputProps={{ disableUnderline: true, sx: { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }, startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /></InputAdornment>) }} />
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, minHeight: 0 }}><CircularProgress size={24} /></Box>
                    ) : (
                        <List sx={{ maxHeight: '400px', overflowY: 'auto', minHeight: 0 }}>
                            {_filteredItems.length === 0 ? (
                                <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No items found.</Typography>
                            ) : (
                                _filteredItems.map((item) => (
                                    <ListItemButton key={item.$id} disabled={tab === 0 && !isSelf} onClick={() => handleSelect(item, tab === 0 ? 'secret' : 'totp')} sx={{ borderRadius: '12px', mb: 1, cursor: tab === 0 && !isSelf ? 'default' : 'pointer', '&:hover': { bgcolor: tab === 0 && !isSelf ? 'transparent' : 'rgba(255,255,255,0.05)' }, opacity: tab === 0 && !isSelf ? 0.5 : 1 }}>
                                        <ListItemIcon>{tab === 0 ? <ShieldIcon sx={{ color: 'primary.main' }} /> : <KeyIcon sx={{ color: '#6366F1' }} />}</ListItemIcon>
                                        <ListItemText primary={tab === 0 ? (item.name || 'Unnamed') : (item.issuer || 'Unknown')} secondary={tab === 0 ? item.username : item.accountName} primaryTypographyProps={{ fontWeight: 600 }} />
                                        {tab === 0 && !isSelf && (<Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>Self-only</Typography>)}
                                    </ListItemButton>
                                ))
                            )}
                        </List>
                    )}
                </Box>
            </Drawer>

            <SudoModal
                isOpen={unlockModalOpen}
                onCancel={() => setUnlockModalOpen(false)}
                onSuccess={async () => {
                    setUnlockModalOpen(false);
                    if (pendingSelection) {
                        const { item, type } = pendingSelection;
                        try {
                            if (type === 'totp') {
                                const decryptedSecret = await ecosystemSecurity.decrypt(item.secretKey);
                                const code = generateSync({ secret: decryptedSecret.replace(/\s+/g, '').toUpperCase() });
                                onSelect({ ...item, currentCode: code }, 'totp');
                            } else {
                                onSelect(item, 'secret');
                            }
                            setPendingSelection(null);
                            onClose();
                        } catch (e: unknown) {
                            console.error('Processing after unlock failed', e);
                        }
                    }
                }}
            />
        </>
    );
};

