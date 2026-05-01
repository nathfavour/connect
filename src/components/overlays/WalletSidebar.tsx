"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import {
    X,
    Wallet as WalletIcon,
    ChevronLeft,
    Lock,
    Unlock,
    Copy,
    ExternalLink,
    Plus,
    History,
    Settings,
    Eye,
    EyeOff,
    ChevronRight,
    Key,
    FileText,
    Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSudo } from '@/context/SudoContext';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { toast } from 'react-hot-toast';
import { KeychainService } from '@/lib/appwrite/keychain';
import { WalletService, type SupportedWalletChain, type WalletSummary } from '@/lib/services/wallets';

interface WalletSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortenAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const WalletSidebar = ({ isOpen, onClose }: WalletSidebarProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
    const { user } = useAuth();
    const { requestSudo } = useSudo();
    const [isUnlocked, setIsUnlocked] = useState(ecosystemSecurity.status.isUnlocked);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasMasterpass, setHasMasterpass] = useState<boolean | null>(null);
    const [wallets, setWallets] = useState<WalletSummary[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadingLabel, setLoadingLabel] = useState('Preparing your secure wallet...');
    const [pendingChain, setPendingChain] = useState<SupportedWalletChain | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [showWalletList, setShowWalletList] = useState(false);
    const [allWallets, setAllWallets] = useState<WalletSummary[]>([]);
    const [isCreatingBurner, setIsCreatingBurner] = useState(false);
    const [viewingSecret, setViewingSecret] = useState<{ type: 'key' | 'phrase'; value: string; chainLabel?: string } | null>(null);
    const [isSecretVisible, setIsSecretVisible] = useState(false);

    const AMBER = '#F59E0B';
    const SURFACE = '#161412';
    const HIGHLIGHT = '#1C1A18';
    const VOID = '#0A0908';

    const rimLight = {
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -1px 0 rgba(0, 0, 0, 0.4)',
    };

    useEffect(() => {
        const unsubscribe = ecosystemSecurity.onStatusChange((status) => {
            if (status.isUnlocked !== isUnlocked) {
                setIsUnlocked(status.isUnlocked);
            }
        });

        return unsubscribe;
    }, [isUnlocked]);

    const refreshWallets = useCallback(async () => {
        if (!user?.$id || !isOpen) return;

        setError(null);

        const masterpassPresent = await KeychainService.hasMasterpass(user.$id);
        setHasMasterpass(masterpassPresent);

        if (!masterpassPresent) {
            setWallets([]);
            return;
        }

        if (!ecosystemSecurity.status.isUnlocked) {
            return;
        }

        setLoading(true);
        setLoadingLabel('Loading your wallets...');

        try {
            const readyWallets = await WalletService.listMainWallets(user.$id);
            setWallets(readyWallets);
        } catch (walletError) {
            console.error('[WalletSidebar] Failed to load wallets', walletError);
            setError(walletError instanceof Error ? walletError.message : 'Failed to load wallet');
        } finally {
            setLoading(false);
        }
    }, [isOpen, user?.$id]);

    const handleProvisionWallets = useCallback(async () => {
        if (!user?.$id) return;

        setLoading(true);
        setLoadingLabel('Provisioning your T4 wallet mesh...');
        setError(null);

        try {
            const readyWallets = await WalletService.ensureMainWallets(user.$id);
            setWallets(readyWallets);
        } catch (walletError) {
            console.error('[WalletSidebar] Failed to provision wallets', walletError);
            setError(walletError instanceof Error ? walletError.message : 'Failed to provision wallet');
        } finally {
            setLoading(false);
        }
    }, [user?.$id]);

    useEffect(() => {
        if (!isOpen) return;
        refreshWallets();
    }, [isOpen, isUnlocked, refreshWallets]);

    useEffect(() => {
        if (isOpen && hasMasterpass === false) {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
            const callbackUrl = encodeURIComponent(baseUrl + '?openWallet=true');
            window.location.href = `https://vault.kylrix.space/masterpass?callbackUrl=${callbackUrl}`;
        }
    }, [isOpen, hasMasterpass]);

    const handleUnlock = useCallback(() => {
        requestSudo({
            onSuccess: async () => {
                toast.success('Wallet Unlocked');
                await refreshWallets();
            }
        });
    }, [requestSudo, refreshWallets]);

    useEffect(() => {
        if (isOpen && !isUnlocked && hasMasterpass !== false && !loading) {
            handleUnlock();
        }
    }, [isOpen, isUnlocked, hasMasterpass, loading, handleUnlock]);

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        toast.success('Address copied');
    };

    const handleAddNetwork = async (chain: SupportedWalletChain) => {
        if (!user?.$id) return;

        setPendingChain(chain);
        setError(null);

        try {
            const updatedWallets = await WalletService.addNetwork(user.$id, chain);
            setWallets(updatedWallets);
            toast.success(`${WalletService.networkDefinitions[chain].label} added`);
        } catch (networkError) {
            console.error('[WalletSidebar] Failed to add network', networkError);
            toast.error(networkError instanceof Error ? networkError.message : 'Failed to add network');
        } finally {
            setPendingChain(null);
        }
    };

    const addableNetworks = useMemo(
        () => WalletService.supportedChains.filter((chain) => !wallets.some((wallet) => wallet.chain === chain)),
        [wallets]
    );

    const getExplorerUrl = (wallet: WalletSummary) => {
        switch (wallet.chain) {
            case 'btc':
                return `https://www.blockchain.com/explorer/addresses/btc/${wallet.address}`;
            case 'sol':
                return `https://solscan.io/account/${wallet.address}`;
            case 'sui':
                return `https://suivision.xyz/account/${wallet.address}`;
            case 'eth':
            case 'usdc':
                return `https://etherscan.io/address/${wallet.address}`;
            case 'base':
                return `https://basescan.org/address/${wallet.address}`;
            case 'polygon':
                return `https://polygonscan.com/address/${wallet.address}`;
            case 'arbitrum':
                return `https://arbiscan.io/address/${wallet.address}`;
            default:
                return null;
        }
    };

    const loadAllWallets = useCallback(async () => {
        if (!user?.$id) return;
        try {
            const list = await WalletService.listAllWallets(user.$id);
            setAllWallets(list);
        } catch (e) {
            console.error('Failed to load all wallets', e);
        }
    }, [user?.$id]);

    const handleCreateBurner = async () => {
        if (!user?.$id) return;
        setIsCreatingBurner(true);
        try {
            await WalletService.createBurnerWallet(user.$id);
            toast.success('Burner wallet identity provisioned');
            await loadAllWallets();
            await refreshWallets();
        } catch (_e) {
            toast.error('Failed to create burner wallet');
        } finally {
            setIsCreatingBurner(false);
        }
    };

    const handleClose = useCallback(() => {
        setShowSettings(false);
        setShowExportOptions(false);
        setShowWalletList(false);
        setViewingSecret(null);
        setIsSecretVisible(false);
        onClose();
    }, [onClose]);

    const renderWalletContent = () => {
        if (viewingSecret) {
            return (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 4 }}>
                        <IconButton 
                            size="small" 
                            onClick={() => {
                                setViewingSecret(null);
                                setIsSecretVisible(false);
                            }}
                            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}
                        >
                            <ChevronLeft size={20} />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', color: 'white' }}>
                            {viewingSecret.type === 'phrase' ? 'Secret Recovery Phrase' : `Private Key (${viewingSecret.chainLabel})`}
                        </Typography>
                    </Stack>

                    <Box sx={{ 
                        p: 3, 
                        bgcolor: SURFACE, 
                        borderRadius: '24px', 
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        ...rimLight,
                        mb: 4
                    }}>
                        <Stack direction="row" gap={1.5} sx={{ mb: 2, color: AMBER }}>
                            <Shield size={20} />
                            <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'Satoshi' }}>
                                Security Warning
                            </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Satoshi', lineHeight: 1.6, display: 'block' }}>
                            Never share your {viewingSecret.type === 'phrase' ? 'recovery phrase' : 'private key'} with anyone. 
                            Anyone with this information can take full control of your assets. 
                            Kylrix support will never ask for this.
                        </Typography>
                    </Box>

                    <Box sx={{ 
                        p: 3, 
                        bgcolor: VOID, 
                        borderRadius: '18px', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                        minHeight: 120,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {isSecretVisible ? (
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: 'white', 
                                    fontFamily: 'JetBrains Mono', 
                                    wordBreak: 'break-all',
                                    lineHeight: 1.8,
                                    letterSpacing: '0.05em',
                                    textAlign: 'center',
                                    px: 2
                                }}
                            >
                                {viewingSecret.value}
                            </Typography>
                        ) : (
                            <Stack alignItems="center" gap={2} sx={{ opacity: 0.3 }}>
                                <Lock size={24} />
                                <Typography variant="caption" sx={{ fontFamily: 'Satoshi', fontWeight: 700 }}>
                                    Content Hidden
                                </Typography>
                            </Stack>
                        )}
                        
                        <Stack direction="row" gap={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
                            <IconButton
                                onClick={() => setIsSecretVisible(!isSecretVisible)}
                                size="small"
                                sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: 'white' } }}
                            >
                                {isSecretVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </IconButton>
                            <IconButton
                                onClick={() => handleCopyAddress(viewingSecret.value)}
                                size="small"
                                sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: AMBER } }}
                            >
                                <Copy size={16} />
                            </IconButton>
                        </Stack>
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                            setViewingSecret(null);
                            setIsSecretVisible(false);
                        }}
                        sx={{
                            bgcolor: SURFACE,
                            color: 'white',
                            fontWeight: 800,
                            borderRadius: '14px',
                            py: 1.5,
                            textTransform: 'none',
                            fontFamily: 'Satoshi',
                            border: '1px solid rgba(255,255,255,0.1)',
                            '&:hover': { bgcolor: HIGHLIGHT }
                        }}
                    >
                        Done
                    </Button>
                </Box>
            );
        }

        if (showExportOptions) {
            return (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 4 }}>
                        <IconButton 
                            size="small" 
                            onClick={() => setShowExportOptions(false)}
                            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}
                        >
                            <ChevronLeft size={20} />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', color: 'white' }}>
                            Export Wallet
                        </Typography>
                    </Stack>

                    <Stack gap={1.5}>
                        <Paper
                            onClick={() => {
                                requestSudo({
                                    onSuccess: async () => {
                                        try {
                                            const phrase = await WalletService.getWalletSecret(user!.$id);
                                            setViewingSecret({ type: 'phrase', value: phrase });
                                        } catch (_e) {
                                            toast.error('Failed to retrieve phrase');
                                        }
                                    }
                                });
                            }}
                            sx={{
                                p: 2,
                                borderRadius: '18px',
                                bgcolor: SURFACE,
                                border: '1px solid rgba(255,255,255,0.03)',
                                ...rimLight,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: HIGHLIGHT, transform: 'translateX(4px)' }
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" gap={2}>
                                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#fff', 0.05), color: 'rgba(255,255,255,0.6)' }}>
                                        <FileText size={18} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontFamily: 'Satoshi' }}>
                                            View Secret Phrase
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Satoshi' }}>
                                            12-word recovery mnemonic
                                        </Typography>
                                    </Box>
                                </Stack>
                                <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                            </Stack>
                        </Paper>

                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', mt: 2, mb: 1, px: 1 }}>
                            Individual Private Keys
                        </Typography>

                        {wallets.map((wallet) => (
                            <Paper
                                key={`export-${wallet.id}`}
                                onClick={() => {
                                    requestSudo({
                                        onSuccess: async () => {
                                            try {
                                                const key = await WalletService.derivePrivateKey(user!.$id, wallet.chain);
                                                setViewingSecret({ type: 'key', value: key, chainLabel: wallet.label });
                                            } catch (_e) {
                                                toast.error('Failed to derive private key');
                                            }
                                        }
                                    });
                                }}
                                sx={{
                                    p: 2,
                                    borderRadius: '18px',
                                    bgcolor: SURFACE,
                                    border: '1px solid rgba(255,255,255,0.03)',
                                    ...rimLight,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { bgcolor: HIGHLIGHT, transform: 'translateX(4px)' }
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Stack direction="row" alignItems="center" gap={2}>
                                        <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha(AMBER, 0.1), color: AMBER }}>
                                            <Key size={18} />
                                        </Box>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontFamily: 'Satoshi' }}>
                                                {wallet.label} Key
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Satoshi' }}>
                                                Export hex private key
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </Box>
            );
        }

        if (showWalletList) {
            const mainWallets = allWallets.filter(w => w.type === 'main');
            const burnerWallets = allWallets.filter(w => w.type === 'burner');
            const agentWallets = allWallets.filter(w => w.type === 'agent_sub_wallet');

            return (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 4 }}>
                        <IconButton 
                            size="small" 
                            onClick={() => setShowWalletList(false)}
                            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}
                        >
                            <ChevronLeft size={20} />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', color: 'white' }}>
                            Wallets
                        </Typography>
                    </Stack>

                    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                        <Stack gap={3}>
                            {mainWallets.length > 0 && (
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.1em', px: 1, mb: 1, display: 'block' }}>
                                        Main Identity
                                    </Typography>
                                    <Stack gap={1}>
                                        {/* Group by address for unique wallet identities */}
                                        {Array.from(new Set(mainWallets.map(w => w.address))).map(addr => {
                                            return (
                                                <Paper key={addr} sx={{ p: 2, borderRadius: '18px', bgcolor: SURFACE, border: '1px solid rgba(255,255,255,0.03)', ...rimLight }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'white' }}>Master Wallet</Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{shortenAddress(addr)}</Typography>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            )}

                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Burner Wallets
                                    </Typography>
                                    <Button 
                                        size="small" 
                                        onClick={handleCreateBurner}
                                        disabled={isCreatingBurner}
                                        startIcon={isCreatingBurner ? <CircularProgress size={12} /> : <Plus size={14} />}
                                        sx={{ color: AMBER, textTransform: 'none', fontWeight: 800, fontSize: '0.7rem' }}
                                    >
                                        New Burner
                                    </Button>
                                </Stack>
                                <Stack gap={1}>
                                    {burnerWallets.length === 0 ? (
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', py: 2 }}>No burner wallets yet</Typography>
                                    ) : (
                                        Array.from(new Set(burnerWallets.map(w => w.address))).map(addr => (
                                            <Paper key={addr} sx={{ p: 2, borderRadius: '18px', bgcolor: SURFACE, border: '1px solid rgba(255,255,255,0.03)', ...rimLight }}>
                                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'white' }}>Burner</Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{shortenAddress(addr)}</Typography>
                                            </Paper>
                                        ))
                                    )}
                                </Stack>
                            </Box>

                            {agentWallets.length > 0 && (
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', px: 1, mb: 1, display: 'block' }}>
                                        Agentic Wallets
                                    </Typography>
                                    <Stack gap={1}>
                                        {Array.from(new Set(agentWallets.map(w => w.address))).map(addr => (
                                            <Paper key={addr} sx={{ p: 2, borderRadius: '18px', bgcolor: SURFACE, border: '1px solid rgba(255,255,255,0.03)', ...rimLight }}>
                                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'white' }}>Automated Agent</Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{shortenAddress(addr)}</Typography>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                </Box>
            );
        }

        if (showSettings) {
            return (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 4 }}>
                        <IconButton 
                            size="small" 
                            onClick={() => setShowSettings(false)}
                            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'white' } }}
                        >
                            <ChevronLeft size={20} />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', color: 'white' }}>
                            Wallet Settings
                        </Typography>
                    </Stack>

                    <Stack gap={1.5}>
                        <Paper
                            onClick={() => {
                                setShowWalletList(true);
                                loadAllWallets();
                            }}
                            sx={{
                                p: 2,
                                borderRadius: '18px',
                                bgcolor: SURFACE,
                                border: '1px solid rgba(255,255,255,0.03)',
                                ...rimLight,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: HIGHLIGHT, transform: 'translateX(4px)' }
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" gap={2}>
                                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha(AMBER, 0.1), color: AMBER }}>
                                        <WalletIcon size={18} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontFamily: 'Satoshi' }}>
                                            Wallets
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Satoshi' }}>
                                            Manage main and burner identities
                                        </Typography>
                                    </Box>
                                </Stack>
                                <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                            </Stack>
                        </Paper>

                        <Paper
                            onClick={() => setShowExportOptions(true)}
                            sx={{
                                p: 2,
                                borderRadius: '18px',
                                bgcolor: SURFACE,
                                border: '1px solid rgba(255,255,255,0.03)',
                                ...rimLight,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: HIGHLIGHT, transform: 'translateX(4px)' }
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" gap={2}>
                                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha(AMBER, 0.1), color: AMBER }}>
                                        <Settings size={18} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontFamily: 'Satoshi' }}>
                                            Export Wallet
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Satoshi' }}>
                                            View keys and recovery phrase
                                        </Typography>
                                    </Box>
                                </Stack>
                                <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                            </Stack>
                        </Paper>
                    </Stack>

                    <Box sx={{ flex: 1 }} />
                    
                    <Typography variant="caption" sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'Satoshi', mb: 2 }}>
                        Kylrix Connect v0.1.0 • T4 Secure
                    </Typography>
                </Box>
            );
        }

        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                        <Box sx={{
                            p: 1,
                            borderRadius: '12px',
                            bgcolor: alpha(AMBER, 0.1),
                            color: AMBER,
                            display: 'flex',
                            ...rimLight
                        }}>
                            <WalletIcon size={20} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', letterSpacing: '-0.02em', color: 'white' }}>
                                Kylrix Wallet
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontFamily: 'Satoshi' }}>
                                T4 Non-Custodial Layer
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton onClick={handleClose} sx={{ color: 'rgba(255, 255, 255, 0.4)', '&:hover': { color: 'white', bgcolor: HIGHLIGHT } }}>
                        <X size={20} />
                    </IconButton>
                </Stack>

                {!user ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', maxWidth: 260, fontFamily: 'Satoshi' }}>
                            Sign in to initialize your wallet mesh.
                        </Typography>
                    </Box>
                ) : hasMasterpass === false ? (
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
                            bgcolor: SURFACE,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                            ...rimLight,
                            color: 'rgba(255, 255, 255, 0.2)'
                        }}>
                            <Lock size={32} />
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, fontFamily: 'Satoshi', color: 'white' }}>
                            Vault Setup Required
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 4, maxWidth: 260, fontFamily: 'Satoshi' }}>
                            Wallet provisioning becomes automatic once your MasterPass exists for Tier 3 encryption.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => {
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
                                const callbackUrl = encodeURIComponent(baseUrl + '?openWallet=true');
                                window.location.href = `https://vault.kylrix.space/masterpass?callbackUrl=${callbackUrl}`;
                            }}
                            sx={{
                                bgcolor: 'white',
                                color: '#000',
                                fontWeight: 900,
                                borderRadius: '14px',
                                px: 4,
                                py: 1.5,
                                textTransform: 'none',
                                fontFamily: 'Satoshi',
                                ...rimLight,
                                '&:hover': { bgcolor: alpha('#fff', 0.9), transform: 'translateY(-1px)' },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            Setup MasterPass
                        </Button>
                    </Box>
                ) : !isUnlocked ? (
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
                            bgcolor: SURFACE,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                            ...rimLight,
                            color: AMBER
                        }}>
                            <Lock size={32} />
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, fontFamily: 'Satoshi', color: 'white' }}>
                            Wallet is Locked
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 4, maxWidth: 240, fontFamily: 'Satoshi' }}>
                            Unlock your secure vault and Connect will auto-provision your main wallet addresses with zero extra input.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleUnlock}
                            startIcon={<Unlock size={18} />}
                            sx={{
                                bgcolor: AMBER,
                                color: '#000',
                                fontWeight: 900,
                                borderRadius: '14px',
                                px: 4,
                                py: 1.5,
                                textTransform: 'none',
                                fontFamily: 'Satoshi',
                                ...rimLight,
                                '&:hover': { bgcolor: alpha(AMBER, 0.9), transform: 'translateY(-1px)' },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            Unlock Wallet
                        </Button>
                    </Box>
                ) : loading ? (
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        px: 2
                    }}>
                        <CircularProgress sx={{ color: AMBER, mb: 3 }} />
                        <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, fontFamily: 'Satoshi', color: 'white' }}>
                            Loading Wallets
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', maxWidth: 280, fontFamily: 'Satoshi' }}>
                            {loadingLabel}
                        </Typography>
                    </Box>
                ) : wallets.length === 0 ? (
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
                            bgcolor: SURFACE,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                            ...rimLight,
                            color: 'rgba(255, 255, 255, 0.2)'
                        }}>
                            <WalletIcon size={32} />
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, fontFamily: 'Satoshi', color: 'white' }}>
                            Wallets Not Provisioned
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 4, maxWidth: 280, fontFamily: 'Satoshi' }}>
                            Your wallet drawer now loads existing wallets only. Provision them explicitly when you are ready.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleProvisionWallets}
                            sx={{
                                bgcolor: AMBER,
                                color: '#000',
                                fontWeight: 900,
                                borderRadius: '14px',
                                px: 4,
                                py: 1.5,
                                textTransform: 'none',
                                fontFamily: 'Satoshi',
                                ...rimLight,
                                '&:hover': { bgcolor: alpha(AMBER, 0.9), transform: 'translateY(-1px)' },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            Provision Wallets
                        </Button>
                    </Box>
                ) : error ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Paper sx={{
                            p: 3,
                            borderRadius: '20px',
                            bgcolor: SURFACE,
                            ...rimLight,
                            textAlign: 'center',
                            maxWidth: 280
                        }}>
                            <Typography variant="body1" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Satoshi', color: 'white' }}>
                                Wallet Sync Failed
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 2, fontFamily: 'Satoshi' }}>
                                {error}
                            </Typography>
                            <Button
                                onClick={refreshWallets}
                                variant="outlined"
                                sx={{
                                    borderRadius: '12px',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    textTransform: 'none',
                                    fontFamily: 'Satoshi',
                                    '&:hover': { bgcolor: HIGHLIGHT, borderColor: 'rgba(255,255,255,0.2)' }
                                }}
                            >
                                Retry
                            </Button>
                        </Paper>
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '10px' } }}>
                        {/* Simplified Balance Header */}
                        <Box sx={{ 
                            p: 3, 
                            mb: 3, 
                            textAlign: 'center',
                            bgcolor: SURFACE,
                            borderRadius: '24px',
                            ...rimLight,
                            position: 'relative',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.03)'
                        }}>
                            <Typography variant="caption" sx={{ color: AMBER, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Satoshi', opacity: 0.8 }}>
                                Estimated Balance
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 900, mt: 0.5, fontFamily: 'var(--font-clash)', color: 'white', letterSpacing: '-0.02em' }}>
                                $0.00
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontWeight: 700, fontFamily: 'Satoshi' }}>
                                {wallets.length} active networks
                            </Typography>
                        </Box>

                        <Stack gap={1.5} sx={{ mb: 4 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Satoshi' }}>
                                Live Networks
                            </Typography>
                            {wallets.map((wallet) => (
                                <Paper
                                    key={wallet.id}
                                    sx={{
                                        p: 1.5,
                                        px: 2,
                                        borderRadius: '18px',
                                        bgcolor: SURFACE,
                                        border: '1px solid rgba(255,255,255,0.03)',
                                        ...rimLight,
                                        transition: 'all 0.2s ease',
                                        '&:hover': { bgcolor: HIGHLIGHT, transform: 'translateX(4px)' }
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'white', fontFamily: 'Satoshi' }}>
                                                {wallet.label}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', display: 'block' }}>
                                                {shortenAddress(wallet.address)}
                                            </Typography>
                                        </Box>
                                        <Stack alignItems="flex-end">
                                            <Typography variant="body2" sx={{ fontWeight: 900, color: AMBER, fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                                                0.00 {wallet.symbol}
                                            </Typography>
                                            <Stack direction="row" gap={0.5} sx={{ mt: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleCopyAddress(wallet.address)}
                                                    sx={{ p: 0.5, color: 'rgba(255,255,255,0.2)', '&:hover': { color: AMBER } }}
                                                >
                                                    <Copy size={14} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        const explorerUrl = getExplorerUrl(wallet);
                                                        if (explorerUrl) {
                                                            window.open(explorerUrl, '_blank', 'noopener,noreferrer');
                                                        }
                                                    }}
                                                    sx={{ p: 0.5, color: 'rgba(255,255,255,0.2)', '&:hover': { color: 'white' } }}
                                                >
                                                    <ExternalLink size={14} />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>

                        {addableNetworks.length > 0 && (
                            <Stack gap={1.5} sx={{ mb: 4 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Satoshi' }}>
                                    Add Network
                                </Typography>
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                    {addableNetworks.map((chain) => (
                                        <Button
                                            key={chain}
                                            variant="outlined"
                                            startIcon={pendingChain === chain ? <CircularProgress size={14} color="inherit" /> : <Plus size={14} />}
                                            onClick={() => handleAddNetwork(chain)}
                                            disabled={pendingChain !== null}
                                            sx={{
                                                borderRadius: '12px',
                                                borderColor: 'rgba(255,255,255,0.08)',
                                                color: 'rgba(255,255,255,0.7)',
                                                textTransform: 'none',
                                                fontWeight: 800,
                                                fontFamily: 'Satoshi',
                                                ...rimLight,
                                                '&:hover': { bgcolor: HIGHLIGHT, borderColor: alpha(AMBER, 0.3), color: 'white' }
                                            }}
                                        >
                                            {WalletService.networkDefinitions[chain].label}
                                        </Button>
                                    ))}
                                </Stack>
                            </Stack>
                        )}

                        <Stack gap={2}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Satoshi' }}>
                                Recent Activity
                            </Typography>
                            <Box sx={{
                                p: 4,
                                textAlign: 'center',
                                borderRadius: '24px',
                                border: '1px dashed rgba(255,255,255,0.05)',
                                bgcolor: 'rgba(255,255,255,0.01)',
                                ...rimLight
                            }}>
                                <History size={24} color="rgba(255,255,255,0.1)" style={{ marginBottom: 12 }} />
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'Satoshi' }}>
                                    No transactions yet
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                )}

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.15)', fontWeight: 700, fontFamily: 'Satoshi' }}>
                        Loaded on open, provisioned on demand
                    </Typography>
                    <IconButton 
                        size="small" 
                        onClick={() => setShowSettings(true)}
                        sx={{ color: 'rgba(255, 255, 255, 0.15)', '&:hover': { color: 'white' } }}
                    >
                        <Settings size={16} />
                    </IconButton>
                </Stack>
            </Box>
        );
    };

    if (isMobile) {
        return (
            <Drawer
                anchor="bottom"
                open={isOpen}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        height: isExpanded ? '100%' : '75%',
                        bgcolor: VOID,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: isExpanded ? '0' : '32px 32px 0 0',
                        backgroundImage: 'none',
                        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden'
                    }
                }}
            >
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
                            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Satoshi' }}>Back</Typography>
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
            onClose={handleClose}
            PaperProps={{
                sx: {
                    width: 400,
                    bgcolor: VOID,
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundImage: 'none',
                    boxShadow: '-40px 0 80px rgba(0,0,0,0.9)'
                }
            }}
        >
            {renderWalletContent()}
        </Drawer>
    );
};
