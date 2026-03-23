"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
} from "@mui/material";
import {
    Lock,
    Fingerprint,
    Eye,
    EyeOff,
    LayoutGrid,
} from "lucide-react";
import Logo from "../common/Logo";
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

export function SudoModal({
    isOpen,
    onSuccess,
    onCancel: _onCancel,
    intent,
}: SudoModalProps) {
    const { user } = useAuth();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [hasPasskey, setHasPasskey] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [hasMasterpass, setHasMasterpass] = useState<boolean | null>(null);
    const [mode, setMode] = useState<any>(null);
    const [isDetecting, setIsDetecting] = useState(true);
    const [showPasskeyIncentive, setShowPasskeyIncentive] = useState(false);

    const handleSuccessWithSync = useCallback(async () => {
        onSuccess();
        
        if (user?.$id) {
            try {
                // Sudo Hook: Ensure E2E Identity is created and published upon successful MasterPass unlock
                console.log("[Connect] Synchronizing Identity...");
                await ecosystemSecurity.ensureE2EIdentity(user.$id);

                if (intent === "reset") {
                    return;
                }

                // Passkey Incentive
                const entries = await KeychainService.listKeychainEntries(user.$id);
                const hasPasskey = entries.some((e: any) => e.type === 'passkey');

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
            const isKylrixDomain = typeof window !== 'undefined' && 
                (window.location.hostname === 'kylrix.space' || window.location.hostname.endsWith('.kylrix.space'));

            const pinSet = ecosystemSecurity.isPinSet();
            setHasPin(pinSet);

            // Check for passkey keychain entry
            KeychainService.listKeychainEntries(user.$id).then(entries => {
                const passkeyPresent = entries.some((e: any) => e.type === 'passkey');
                const passwordPresent = entries.some((e: any) => e.type === 'password');
                
                // Disable passkey if not on kylrix.space domain
                const effectivePasskeyPresent = passkeyPresent && isKylrixDomain;
                
                setHasPasskey(effectivePasskeyPresent);
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
                    setMode(effectivePasskeyPresent ? "passkey" : "password");
                    setIsDetecting(false);
                    return;
                }

                // Enforce Master Password setup if missing
                if (!passwordPresent && isOpen) {
                    handleRedirectToVaultSetup();
                    setIsDetecting(false);
                    return;
                }

                if (effectivePasskeyPresent) {
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
            setLoading(false);
            setPasskeyLoading(false);
            setIsDetecting(true);
        }
    }, [isOpen, user?.$id, intent, handleRedirectToVaultSetup]);

    useEffect(() => {
        if (isOpen && mode === "passkey" && hasPasskey) {
            handlePasskeyVerify();
        }
    }, [isOpen, mode, hasPasskey, handlePasskeyVerify]);

    if (showPasskeyIncentive && user) {
        return (
            <PasskeySetup
                isOpen={true}
                // Closing the dialog without explicit Skip should simply hide the incentive
                // and NOT complete the Sudo flow. Only an explicit Skip should allow access.
                onClose={() => {
                    setShowPasskeyIncentive(false);
                }}
                // Explicit Skip -> allow access to the page (complete Sudo)
                onSkip={() => {
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
            onClose={() => { }} // Prevent closing by clicking outside
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
                    width: '100%',
                    maxWidth: '400px',
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
            <DialogTitle sx={{ textAlign: 'center', pt: 6, pb: 1, position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)' }}>
                    <Box sx={{ position: 'relative' }}>
                        <Logo 
                            variant="icon" 
                            size={64} 
                            app="connect"
                            sx={{
                                borderRadius: '18px',
                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                                bgcolor: '#0A0908'
                            }} 
                        />
                        <Box sx={{
                            position: 'absolute',
                            bottom: -6,
                            right: -6,
                            width: 28,
                            height: 28,
                            borderRadius: '8px',
                            bgcolor: '#6366F1',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                            border: '3px solid #0a0a0a',
                            zIndex: 1
                        }}>
                            <Lock size={14} strokeWidth={3} />
                        </Box>
                    </Box>
                </Box>

                <Typography variant="h5" sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    fontFamily: 'var(--font-clash)',
                    color: 'white',
                    mt: 4
                }}>
                    {user?.name || "User"}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mt: 1, fontFamily: 'var(--font-satoshi)', fontWeight: 600 }}>
                    Enter MasterPass to continue
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pb: 4 }}>
                {isDetecting || (loading && !password && mode !== "pin") ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress sx={{ color: '#6366F1' }} />
                    </Box>
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
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '14px',
                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&.Mui-focused fieldset': { borderColor: '#6366F1' },
                                    },
                                    '& .MuiInputBase-input': { color: 'white' }
                                }}
                            />
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
                                        <stop offset="0%" stopColor="#6366F1" />
                                        <stop offset="100%" stopColor="#4F46E5" />
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
                                <Fingerprint size={32} color={passkeyLoading ? '#6366F1' : 'rgba(255, 255, 255, 0.4)'} />
                            </Box>
                        </Box>

                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {passkeyLoading ? "CONFIRM ON DEVICE" : "TAP TO VERIFY"}
                        </Typography>

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
                    <Stack spacing={3} component="form" onSubmit={handlePasswordVerify}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, mb: 1, display: 'block' }}>
                                MASTER PASSWORD
                            </Typography>
                            <TextField
                                fullWidth
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your master password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoFocus
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock size={18} color="rgba(255, 255, 255, 0.3)" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '14px',
                                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&.Mui-focused fieldset': { borderColor: '#6366F1' },
                                    },
                                    '& .MuiInputBase-input': { color: 'white' }
                                }}
                            />
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            sx={{
                                py: 1.8,
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                color: '#000000',
                                fontWeight: 800,
                                fontFamily: 'var(--font-satoshi)',
                                textTransform: 'none',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.25)'
                                }
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : "Verify Identity"}
                        </Button>

                        {hasPasskey && mode !== "passkey" && (
                            <Button
                                fullWidth
                                variant="text"
                                startIcon={<Fingerprint size={18} />}
                                onClick={() => {
                                    setMode("passkey");
                                    handlePasskeyVerify();
                                }}
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    py: 1.5,
                                    borderRadius: '14px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    textTransform: 'none',
                                    fontFamily: 'var(--font-satoshi)',
                                    fontWeight: 600,
                                    '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.15)' },
                                    mt: 1
                                }}
                            >
                                Use Passkey
                            </Button>
                        )}

                        {hasPin && mode !== "pin" && (
                            <Button
                                fullWidth
                                variant="text"
                                startIcon={<LayoutGrid size={18} />}
                                onClick={() => setMode("pin")}
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    py: 1,
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    fontFamily: 'var(--font-satoshi)',
                                    fontWeight: 500,
                                    '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.03)' },
                                    mt: 0.5
                                }}
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
                                sx={{
                                    color: 'error.main',
                                    fontSize: '0.75rem',
                                    mt: 1,
                                    '&:hover': { bgcolor: alpha('#ef4444', 0.1) },
                                    textTransform: 'none',
                                    fontWeight: 600
                                }}
                            >
                                Reset Master Password
                            </Button>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ flexDirection: 'column', p: 4, pt: 0, gap: 2 }}>
                {/* No logout here */}
            </DialogActions>
        </Dialog>
    );
}
