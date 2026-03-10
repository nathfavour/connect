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
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface SudoModalProps {
    isOpen: boolean;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function SudoModal({
    isOpen,
    onSuccess,
    onCancel,
}: SudoModalProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [hasPasskey, setHasPasskey] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [mode, setMode] = useState<"passkey" | "password" | "pin">("password");
    const [isDetecting, setIsDetecting] = useState(true);
    const [showPasskeyIncentive, setShowPasskeyIncentive] = useState(false);

    const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, "");
        setPin(val);
        if (val.length === 4 && user?.$id) {
            setLoading(true);
            try {
                const success = await ecosystemSecurity.unlockWithPin(val);
                if (success) {
                    onSuccess();
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
        setLoading(true);
        try {
            const keychain = await ecosystemSecurity.fetchKeychain(user.$id);
            const success = await ecosystemSecurity.unlock(password, keychain);
            if (success) {
                onSuccess();
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
                onSuccess();
            }
        } catch (e) {
            console.error("Passkey verification failed or cancelled", e);
        } finally {
            setPasskeyLoading(false);
        }
    }, [user?.$id, isOpen, onSuccess]);

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

                // Enforce Master Password first
                if (!passwordPresent && isOpen) {
                    toast.error("Master password required for security actions");
                    router.push("/masterpass");
                    onCancel();
                    return;
                }

                if (passkeyPresent) {
                    setMode("passkey");
                    handlePasskeyVerify();
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
    }, [isOpen, user, handlePasskeyVerify, onCancel, router]);

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
                    borderRadius: '28px',
                    bgcolor: 'rgba(10, 10, 10, 0.95)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundImage: 'none',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden'
                }
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1, position: 'relative' }}>
                <IconButton
                    onClick={onCancel}
                    sx={{
                        position: 'absolute',
                        right: 16,
                        top: 16,
                        color: 'rgba(255, 255, 255, 0.3)',
                        '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.05)' }
                    }}
                >
                    <X size={20} />
                </IconButton>

                <Box sx={{
                    display: 'inline-flex',
                    p: 1.5,
                    borderRadius: '16px',
                    bgcolor: alpha('#E2B714', 0.1),
                    color: '#E2B714',
                    mb: 2
                }}>
                    <Shield size={32} />
                </Box>
                <Typography variant="h5" sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    fontFamily: 'var(--font-space-grotesk)',
                    color: 'white'
                }}>
                    Security Check
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
                    Unlock your local node to access encrypted messages
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pb: 4 }}>
                {isDetecting ? (
                    <Stack spacing={3} sx={{ mt: 4, mb: 2, alignItems: 'center' }}>
                        <CircularProgress size={48} sx={{ color: '#E2B714' }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                            PREPARING SECURITY CHECK...
                        </Typography>
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
                                        '&.Mui-focused fieldset': { borderColor: '#E2B714' },
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
                                borderRadius: '50%',
                                border: '2px dashed',
                                borderColor: passkeyLoading ? '#E2B714' : 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                animation: passkeyLoading ? 'pulse 2s infinite' : 'none',
                                '&:hover': {
                                    borderColor: '#E2B714',
                                    bgcolor: alpha('#E2B714', 0.05)
                                }
                            }}
                        >
                            <Fingerprint size={40} color={passkeyLoading ? '#E2B714' : 'rgba(255, 255, 255, 0.4)'} />
                        </Box>

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                                Use Face ID / Touch ID
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                Authenticate with your device security
                            </Typography>
                        </Box>

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handlePasskeyVerify}
                            disabled={passkeyLoading}
                            sx={{
                                py: 1.5,
                                borderRadius: '14px',
                                bgcolor: '#E2B714',
                                color: '#000',
                                fontWeight: 700,
                                '&:hover': {
                                    bgcolor: alpha('#E2B714', 0.8),
                                },
                                '&.Mui-disabled': {
                                    bgcolor: alpha('#E2B714', 0.1),
                                    color: 'rgba(255, 255, 255, 0.3)'
                                }
                            }}
                        >
                            {passkeyLoading ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CircularProgress size={20} color="inherit" />
                                    <span>Waiting for Passkey...</span>
                                </Stack>
                            ) : "Verify with Passkey"}
                        </Button>

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
                                                '&.Mui-focused fieldset': { borderColor: '#E2B714' },
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
                                        bgcolor: '#E2B714',
                                        color: '#000',
                                        fontWeight: 700,
                                        '&:hover': {
                                            bgcolor: alpha('#E2B714', 0.8),
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 8px 20px rgba(226, 183, 20, 0.3)'
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

                        {hasPasskey && (
                            <Button
                                fullWidth
                                variant="text"
                                startIcon={<Fingerprint size={18} />}
                                onClick={() => setMode("passkey")}
                                sx={{ color: 'rgba(255, 255, 255, 0.5)', '&:hover': { color: 'white' } }}
                            >
                                Use Passkey
                            </Button>
                        )}

                        {hasPin && (
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
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}
