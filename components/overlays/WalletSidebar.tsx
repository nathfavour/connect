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

export const WalletSidebar = ({ isOpen, onClose }: WalletSidebarProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

    useEffect(() => {
        const interval = setInterval(() => {
            if (ecosystemSecurity.status.isUnlocked !== isUnlocked) {
                setIsUnlocked(ecosystemSecurity.status.isUnlocked);
            }
        }, 1000);

        return () => clearInterval(interval);
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
        setLoadingLabel('Provisioning your T4 wallet mesh...');

        try {
            const readyWallets = await WalletService.ensureMainWallets(user.$id);
            setWallets(readyWallets);
        } catch (walletError) {
            console.error('[WalletSidebar] Failed to load wallets', walletError);
            setError(walletError instanceof Error ? walletError.message : 'Failed to load wallet');
        } finally {
            setLoading(false);
        }
    }, [isOpen, user?.$id]);

    useEffect(() => {
        if (!isOpen) return;
        refreshWallets();
    }, [isOpen, isUnlocked, refreshWallets]);

    const handleUnlock = () => {
        requestSudo({
            onSuccess: async () => {
                toast.success('Wallet Unlocked');
                await refreshWallets();
            }
        });
    };

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

    const primaryWallet = useMemo(
        () => wallets.find((wallet) => wallet.chain === 'eth') || wallets[0] || null,
        [wallets]
    );

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

    const renderWalletContent = () => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
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
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)', letterSpacing: '-0.02em' }}>
                            Kylrix Wallet
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
                            T4 Non-Custodial Layer
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    <X size={20} />
                </IconButton>
            </Stack>

            {!user ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', maxWidth: 260 }}>
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
                        Vault Setup Required
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', maxWidth: 260 }}>
                        Wallet provisioning becomes automatic once your MasterPass exists for Tier 3 encryption.
                    </Typography>
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
                        Unlock your secure vault and Connect will auto-provision your main wallet addresses with zero extra input.
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
                    <CircularProgress sx={{ color: '#6366F1', mb: 3 }} />
                    <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
                        Auto-Provisioning Wallets
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', maxWidth: 280 }}>
                        {loadingLabel}
                    </Typography>
                </Box>
            ) : error ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paper sx={{
                        p: 3,
                        borderRadius: '20px',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        textAlign: 'center',
                        maxWidth: 280
                    }}>
                        <Typography variant="body1" sx={{ fontWeight: 800, mb: 1 }}>
                            Wallet Sync Failed
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 2 }}>
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
                            }}
                        >
                            Retry
                        </Button>
                    </Paper>
                </Box>
            ) : (
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {primaryWallet && (
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
                                        Main Wallet Mesh
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, fontFamily: 'var(--font-clash)' }}>
                                        {wallets.length} Chains
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'white' }}>{primaryWallet.symbol}</Typography>
                                </Box>
                            </Stack>

                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 2 }}>
                                Freshly provisioned from your unlocked vault and published to your public profile.
                            </Typography>

                            <Stack
                                direction="row"
                                alignItems="center"
                                gap={1}
                                sx={{
                                    bgcolor: 'rgba(0,0,0,0.2)',
                                    p: 1.5,
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                                }}
                                onClick={() => handleCopyAddress(primaryWallet.address)}
                            >
                                <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                                    {primaryWallet.address}
                                </Typography>
                                <Copy size={14} color="rgba(255,255,255,0.4)" />
                            </Stack>
                        </Paper>
                    )}

                    <Stack direction="row" gap={2} sx={{ mb: 4 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => primaryWallet && handleCopyAddress(primaryWallet.address)}
                            startIcon={<Copy size={18} />}
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
                            Copy Primary
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => {
                                if (!primaryWallet) return;
                                const explorerUrl = getExplorerUrl(primaryWallet);
                                if (explorerUrl) {
                                    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
                                }
                            }}
                            startIcon={<ExternalLink size={18} />}
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
                            Explorer
                        </Button>
                    </Stack>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 3 }} />

                    <Stack gap={1.5} sx={{ mb: 4 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Live Networks
                        </Typography>
                        {wallets.map((wallet) => (
                            <Paper
                                key={wallet.chain}
                                sx={{
                                    p: 2,
                                    borderRadius: '18px',
                                    bgcolor: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                            {wallet.label}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono', display: 'block', mt: 0.3 }}>
                                            {wallet.address}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" gap={0.5}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleCopyAddress(wallet.address)}
                                            sx={{ color: 'rgba(255,255,255,0.45)' }}
                                        >
                                            <Copy size={16} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                const explorerUrl = getExplorerUrl(wallet);
                                                if (explorerUrl) {
                                                    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
                                                }
                                            }}
                                            sx={{ color: 'rgba(255,255,255,0.45)' }}
                                        >
                                            <ExternalLink size={16} />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>

                    {addableNetworks.length > 0 && (
                        <Stack gap={1.5} sx={{ mb: 4 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
                                            color: 'white',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: alpha('#6366F1', 0.35) }
                                        }}
                                    >
                                        {WalletService.networkDefinitions[chain].label}
                                    </Button>
                                ))}
                            </Stack>
                        </Stack>
                    )}

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

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', my: 2 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                    Auto-provisioned once unlocked
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
