"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Button,
    TextField,
    Box,
    IconButton,
    CircularProgress,
    Stack,
    Fade,
    alpha,
    InputAdornment,
    useTheme,
} from "@mui/material";
import {
    Lock,
    Fingerprint,
    X,
    Shield,
    Zap
} from "lucide-react";
import { ecosystemSecurity } from "@/lib/ecosystem/security";
import { KeychainService } from "@/lib/appwrite/keychain";
import { useAuth } from "@/lib/auth";
import { unlockWithPasskey } from "@/lib/passkey";
import { PasskeySetup } from "./PasskeySetup";
import { toast } from "react-hot-toast";

interface SudoModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onCancel: () => void;
    intent?: "unlock" | "initialize" | "reset";
}

export default function SudoModal({
    isOpen,
    onSuccess,
    onCancel,
    intent,
}: SudoModalProps) {
    const theme = useTheme();
    const { user } = useAuth();
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [hasPasskey, setHasPasskey] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [hasMasterpass, setHasMasterpass] = useState<boolean | null>(null);
    const [mode, setMode] = useState<"passkey" | "password" | "pin" | "initialize" | null>(null);
    const [isDetecting, setIsDetecting] = useState(true);
    const [showPasskeyIncentive, setShowPasskeyIncentive] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isResetting, setIsResetting] = useState(false);
    const [resetStep, setResetStep] = useState(1);

    const handleSuccessWithSync = useCallback(async () => {
        if (user?.$id) {
            try {
                // Sudo Hook: Ensure E2E Identity is created and published upon successful MasterPass unlock
                console.log("[Connect] Synchronizing Identity...");
                await ecosystemSecurity.ensureE2EIdentity(user.$id);

                // Passkey Incentive
                const entries = await KeychainService.listKeychainEntries(user.$id);
                const hasPasskey = entries.some((e: any) => e.type === 'passkey');

                if (intent === "reset") {
                    const callbackUrl = encodeURIComponent(window.location.href);
                    window.location.href = `https://vault.kylrix.space/masterpass/reset?callbackUrl=${callbackUrl}`;
                    return;
                }

                if (!hasPasskey) {
                    const skipTimestamp = localStorage.getItem(`passkey_skip_${user.$id}`);
                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    if (!skipTimestamp || (Date.now() - parseInt(skipTimestamp)) > sevenDays) {
                        setShowPasskeyIncentive(true);
                        return;
                    }
                }
            } catch (e) {
                console.error("[Connect] Failed to sync identity on unlock", e);
            }
        }
        onSuccess();
    }, [user, onSuccess, intent]);

    const handleRedirectToVaultSetup = useCallback(() => {
        const callbackUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://vault.kylrix.space/masterpass?callbackUrl=${callbackUrl}`;
    }, []);

    const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, "");
        setPin(val);
        if (val.length === 4 && user?.$id) {
            setLoading(true);
            try {
                const success = await ecosystemSecurity.unlockWithPin(val);
                if (success) {
                    handleSuccessWithSync();
                } else {
                    toast.error("Invalid PIN");
                    setPin("");
                }
            } catch (_e: unknown) {
                toast.error("Verification failed");
                setPin("");
            } finally {
                setLoading(false);
            }
        }
    };

    const handlePasswordVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.$id) return;

        if (hasMasterpass === false) {
            handleRedirectToVaultSetup();
            return;
        }

        setLoading(true);
        try {
            const keychain = await ecosystemSecurity.fetchKeychain(user.$id);
            if (!keychain) {
                setHasMasterpass(false);
                handleRedirectToVaultSetup();
                setLoading(false);
                return;
            }
            const success = await ecosystemSecurity.unlock(password, keychain);
            if (success) {
                handleSuccessWithSync();
            } else {
                toast.error("Invalid Master Password");
            }
        } catch (_e: unknown) {
            toast.error("Verification failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePasskeyVerify = useCallback(async () => {
        if (!user?.$id || !isOpen) return;
        setPasskeyLoading(true);
        try {
            const success = await unlockWithPasskey(user.$id);
            if (success && isOpen) {
                toast.success("Verified via Passkey");
                handleSuccessWithSync();
            }
        } catch (e) {
            console.error("Passkey verification failed or cancelled", e);
        } finally {
            setPasskeyLoading(false);
        }
    }, [user?.$id, isOpen, handleSuccessWithSync]);

    // Check if user has passkey and PIN set up
    useEffect(() => {
        if (isOpen && user?.$id) {
            const pinSet = ecosystemSecurity.isPinSet();
            setHasPin(pinSet);

            // Check for passkey keychain entry
            KeychainService.listKeychainEntries(user.$id).then(entries => {
                const passkeyPresent = entries.some((e: any) => e.type === 'passkey');
                const passwordPresent = entries.some((e: any) => e.type === 'password');
                setHasPasskey(passkeyPresent);
                setHasMasterpass(passwordPresent);

                // Intent Logic
                if (intent === "initialize") {
                    if (passwordPresent) {
                        toast.error("MasterPass already set");
                        setMode("password");
                    } else {
                        handleRedirectToVaultSetup();
                    }
                    setIsDetecting(false);
                    return;
                }

                if (intent === "reset") {
                    setIsResetting(true);
                    setMode(passkeyPresent ? "passkey" : "password");
                    setIsDetecting(false);
                    return;
                }

                // Enforce Master Password setup if missing
                if (!passwordPresent && isOpen) {
                    handleRedirectToVaultSetup();
                    setIsDetecting(false);
                    return;
                }

                if (passkeyPresent) {
                    setMode("passkey");
                } else if (pinSet) {
                    setMode("pin");
                } else {
                    setMode("password");
                }
                setIsDetecting(false);
            }).catch(() => {
                setIsDetecting(false);
                setMode("password");
            });

            // Reset state on open
            setPassword("");
            setPin("");
            setConfirmPassword("");
            setLoading(false);
            setPasskeyLoading(false);
            setIsDetecting(true);
        }
    }, [isOpen, user?.$id, intent, handleRedirectToVaultSetup]);

    useEffect(() => {
        if (isOpen && mode === "passkey" && hasPasskey && !passkeyLoading) {
            handlePasskeyVerify();
        }
    }, [isOpen, mode, hasPasskey, handlePasskeyVerify]);

    const handleFinalReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.$id || !user?.email || !password) return;
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const mek = await ecosystemSecurity.generateRandomMEK();
            const salt = crypto.getRandomValues(new Uint8Array(32));
            const wrappedKey = await ecosystemSecurity.wrapMEK(mek, password, salt);
            
            const entries = await KeychainService.listKeychainEntries(user.$id);
            const passEntry = entries.find((e: any) => e.type === 'password');
            if (passEntry) await KeychainService.deleteKeychainEntry(passEntry.$id);

            await KeychainService.createKeychainEntry({
                userId: user.$id,
                type: 'password',
                wrappedKey: wrappedKey,
                salt: btoa(String.fromCharCode(...salt)),
                params: JSON.stringify({ iterations: 600000, hash: "SHA-256" }),
                isBackup: false
            });

            const rawMek = await crypto.subtle.exportKey("raw", mek);
            await ecosystemSecurity.importMasterKey(rawMek);
            toast.success("MasterPass reset complete");
            onSuccess();
        } catch (err) {
            toast.error("Reset failed");
        } finally {
            setLoading(false);
        }
    };

    if (showPasskeyIncentive && user) {
        return (
            <PasskeySetup
                isOpen={true}
                onClose={() => {
                    setShowPasskeyIncentive(false);
                    onSuccess();
                }}
                userId={user.$id}
                onSuccess={() => {
                    setShowPasskeyIncentive(false);
                    onSuccess();
                }}
                trustUnlocked={true}
            />
        );
    }

    return (
        <Dialog
            open={isOpen}
            onClose={onCancel}
            maxWidth="xs"
            fullWidth
            TransitionComponent={Fade}
            PaperProps={{
                sx: {
                    borderRadius: '32px',
                    bgcolor: 'rgba(5, 5, 5, 0.03)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundImage: 'none',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
                    overflow: 'hidden'
                }
            }}
        >
            <style>{`
                @keyframes race {
                    from { stroke-dashoffset: 240; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes pulse-hex {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <DialogTitle sx={{ textAlign: 'center', pt: 5, pb: 1, position: 'relative' }}>
                <IconButton
                    onClick={onCancel}
                    sx={{
                        position: 'absolute',
                        right: 20,
                        top: 20,
                        color: 'rgba(255, 255, 255, 0.3)',
                        '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.05)' }
                    }}
                >
                    <X size={20} />
                </IconButton>

                <Box sx={{ position: 'relative', mb: 3, display: 'inline-flex' }}>
                    <Box 
                        component="img" 
                        src="/logo.jpg" 
                        alt="App Logo" 
                        sx={{ 
                            width: 64, 
                            height: 64, 
                            borderRadius: '16px',
                            objectFit: 'cover',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                        }} 
                    />
                    <Box sx={{
                        position: 'absolute',
                        bottom: -8,
                        right: -8,
                        width: 32,
                        height: 32,
                        borderRadius: '10px',
                        bgcolor: '#F59E0B',
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                        border: '3px solid rgba(5, 5, 5, 1)',
                        zIndex: 1
                    }}>
                        <Shield size={16} strokeWidth={3} />
                    </Box>
                </Box>
                <Typography variant="h5" sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    fontFamily: 'var(--font-clash)',
                    color: 'white'
                }}>
                    {user?.name || "User"}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mt: 1, fontFamily: 'var(--font-satoshi)' }}>
                    Security verification required
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pb: 4 }}>
                {isResetting && resetStep === 2 ? (
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <Box sx={{
                            p: 2,
                            borderRadius: '16px',
                            bgcolor: alpha('#ef4444', 0.1),
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}>
                            <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Shield size={16} /> RESET MASTERPASS
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 0.5, display: 'block' }}>
                                This will replace your current master password. Your encrypted data will remain accessible with the new password.
                            </Typography>
                        </Box>

                        <form onSubmit={handleFinalReset}>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, mb: 1, display: 'block' }}>
                                        ENTER NEW MASTERPASS
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        placeholder="New master password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoFocus
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock size={18} color="rgba(255, 255, 255, 0.3)" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '14px',
                                                bgcolor: 'rgba(255, 255, 255, 0.03)',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                                '&.Mui-focused fieldset': { borderColor: '#ef4444' },
                                            },
                                            '& .MuiInputBase-input': { color: 'white' }
                                        }}
                                    />
                                </Box>

                                <Button
                                    fullWidth
                                    type="submit"
                                    variant="contained"
                                    disabled={loading || !password || password.length < 8}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: '14px',
                                        bgcolor: '#ef4444',
                                        color: '#fff',
                                        fontWeight: 700,
                                        '&:hover': {
                                            bgcolor: alpha('#ef4444', 0.8),
                                        }
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : "Reset and Update Vault"}
                                </Button>
                            </Stack>
                        </form>
                    </Stack>
                ) : isDetecting || passkeyLoading ? (
                    <Stack spacing={3} sx={{ mt: 4, mb: 2, alignItems: 'center' }}>
                        <CircularProgress size={48} sx={{ color: '#F59E0B' }} />
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, letterSpacing: '0.1em' }}>
                                {passkeyLoading ? "AUTHENTICATING..." : "PREPARING SECURITY CHECK..."}
                            </Typography>
                        </Box>
                        {passkeyLoading && (
                            <Button
                                fullWidth
                                variant="text"
                                size="small"
                                onClick={() => setMode("password")}
                                sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white' } }}
                            >
                                Use Master Password
                            </Button>
                        )}
                    </Stack>
                ) : mode === "initialize" ? (
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <form onSubmit={handleInitializeMasterPass}>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, mb: 1, display: 'block' }}>
                                        SET MASTER PASSWORD
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        placeholder="Create a strong password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoFocus
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock size={18} color="rgba(255, 255, 255, 0.3)" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '14px',
                                                bgcolor: 'rgba(255, 255, 255, 0.03)',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                                '&.Mui-focused fieldset': { borderColor: '#F59E0B' },
                                            },
                                            '& .MuiInputBase-input': { color: 'white' }
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, mb: 1, display: 'block' }}>
                                        CONFIRM PASSWORD
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        placeholder="Repeat your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Shield size={18} color="rgba(255, 255, 255, 0.3)" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '14px',
                                                bgcolor: 'rgba(255, 255, 255, 0.03)',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                                '&.Mui-focused fieldset': { borderColor: '#F59E0B' },
                                            },
                                            '& .MuiInputBase-input': { color: 'white' }
                                        }}
                                    />
                                </Box>

                                <Button
                                    fullWidth
                                    type="submit"
                                    variant="contained"
                                    disabled={loading || !password || !confirmPassword}
                                    sx={{
                                        py: 1.8,
                                        borderRadius: '16px',
                                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                        color: '#000',
                                        fontWeight: 800,
                                        fontFamily: 'var(--font-satoshi)',
                                        textTransform: 'none',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.25)'
                                        }
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : "Initialize Ecosystem Vault"}
                                </Button>

                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', mt: 1 }}>
                                    Your MasterPass is the key to all your secure data. <br /> It cannot be recovered if lost.
                                </Typography>
                            </Stack>
                        </form>
                    </Stack>
                ) : mode === "pin" ? (
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, mb: 1, display: 'block', textAlign: 'center' }}>
                                ENTER 4-DIGIT PIN
                            </Typography>
                            <TextField
                                fullWidth
                                type="password"
                                placeholder="••••"
                                value={pin}
                                onChange={handlePinChange}
                                autoFocus
                                inputProps={{
                                    maxLength: 4,
                                    inputMode: 'numeric',
                                    style: { textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5em' }
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Zap size={18} color="rgba(255, 255, 255, 0.3)" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '14px',
                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&.Mui-focused fieldset': { borderColor: '#F59E0B' },
                                    },
                                    '& .MuiInputBase-input': { color: 'white' }
                                }}
                            />
                        </Box>

                        <Box sx={{ width: '100%', position: 'relative', py: 1 }}>
                            <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                            <Typography variant="caption" sx={{
                                position: 'relative',
                                bgcolor: 'rgba(10, 10, 10, 1)',
                                px: 2,
                                mx: 'auto',
                                display: 'table',
                                color: 'rgba(255, 255, 255, 0.3)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Or
                            </Typography>
                        </Box>

                        <Button
                            fullWidth
                            variant="text"
                            size="small"
                            onClick={() => setMode("password")}
                            sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white' } }}
                        >
                            Use Master Password
                        </Button>
                    </Stack>
                ) : mode === "passkey" ? (
                    <Stack spacing={3} sx={{ mt: 2, alignItems: 'center' }}>
                        <Box
                            onClick={handlePasskeyVerify}
                            sx={{
                                width: 80,
                                height: 80,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            <svg width="80" height="80" viewBox="0 0 80 80">
                                <path
                                    d="M40 5 L70 22.5 L70 57.5 L40 75 L10 57.5 L10 22.5 Z"
                                    fill="transparent"
                                    stroke="rgba(255, 255, 255, 0.1)"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                />
                                {passkeyLoading && (
                                    <path
                                        d="M40 5 L70 22.5 L70 57.5 L40 75 L10 57.5 L10 22.5 Z"
                                        fill="transparent"
                                        stroke="url(#racingGradient)"
                                        strokeWidth="3"
                                        strokeDasharray="60 180"
                                        style={{
                                            animation: 'race 2s linear infinite'
                                        }}
                                    />
                                )}
                                <defs>
                                    <linearGradient id="racingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#F59E0B" />
                                        <stop offset="100%" stopColor="#D97706" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <Box sx={{
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: passkeyLoading ? 'pulse-hex 2s infinite ease-in-out' : 'none'
                            }}>
                                <Fingerprint size={32} color={passkeyLoading ? '#F59E0B' : 'rgba(255, 255, 255, 0.4)'} />
                            </Box>
                        </Box>

                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {passkeyLoading ? "CONFIRM ON DEVICE" : "TAP TO VERIFY"}
                        </Typography>

                        <Box sx={{ width: '100%', position: 'relative', py: 1 }}>
                            <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                            <Typography variant="caption" sx={{
                                position: 'relative',
                                bgcolor: 'rgba(10, 10, 10, 1)',
                                px: 2,
                                mx: 'auto',
                                display: 'table',
                                color: 'rgba(255, 255, 255, 0.2)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Or
                            </Typography>
                        </Box>

                        <Button
                            fullWidth
                            variant="text"
                            size="small"
                            onClick={() => setMode("password")}
                            sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white' } }}
                        >
                            Use Master Password
                        </Button>
                    </Stack>
                ) : (
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <form onSubmit={handlePasswordVerify}>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, mb: 1, display: 'block' }}>
                                        MASTER PASSWORD
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        placeholder="Enter your master password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoFocus
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock size={18} color="rgba(255, 255, 255, 0.3)" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '14px',
                                                bgcolor: 'rgba(255, 255, 255, 0.03)',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                                '&.Mui-focused fieldset': { borderColor: '#F59E0B' },
                                            },
                                            '& .MuiInputBase-input': { color: 'white' }
                                        }}
                                    />
                                </Box>

                                <Button
                                    fullWidth
                                    type="submit"
                                    variant="contained"
                                    disabled={loading || !password}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: '14px',
                                        bgcolor: '#F59E0B',
                                        color: '#000',
                                        fontWeight: 700,
                                        '&:hover': {
                                            bgcolor: alpha('#F59E0B', 0.8),
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)'
                                        }
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : "Confirm Password"}
                                </Button>
                            </Stack>
                        </form>


                        {(hasPasskey || hasPin) && (
                            <Box sx={{ width: '100%', position: 'relative', py: 1 }}>
                                <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                                <Typography variant="caption" sx={{
                                    position: 'relative',
                                    bgcolor: 'rgba(10, 10, 10, 1)',
                                    px: 2,
                                    mx: 'auto',
                                    display: 'table',
                                    color: 'rgba(255, 255, 255, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}>
                                    Or
                                </Typography>
                            </Box>
                        )}

                        {hasPasskey && mode !== "passkey" && (
                            <Button
                                fullWidth
                                variant="text"
                                startIcon={<Fingerprint size={18} />}
                                onClick={() => {
                                    setMode("passkey");
                                    handlePasskeyVerify();
                                }}
                                sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white' } }}
                            >
                                Use Passkey
                            </Button>
                        )}

                        {hasPin && mode !== "pin" && (
                            <Button
                                fullWidth
                                variant="text"
                                startIcon={<Zap size={18} />}
                                onClick={() => setMode("pin")}
                                sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white' } }}
                            >
                                Use PIN
                            </Button>
                        )}

                        {mode === "password" && (
                            <Button
                                fullWidth
                                variant="text"
                                size="small"
                                onClick={() => {
                                    const callbackUrl = encodeURIComponent(window.location.href);
                                    window.location.href = `https://vault.kylrix.space/masterpass/reset?callbackUrl=${callbackUrl}`;
                                }}
                                sx={{ color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }, mt: 2 }}
                            >
                                Reset Master Password
                            </Button>
                        )}
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}
