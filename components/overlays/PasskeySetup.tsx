"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Typography,
  Box,
  Stack,
  CircularProgress,
  useTheme
} from "@mui/material";
import { startRegistration } from "@simplewebauthn/browser";
import { KeychainService } from "@/lib/appwrite/keychain";
import { ecosystemSecurity } from "@/lib/ecosystem/security";
import { databases } from "@/generated/appwrite/databases";
import toast from "react-hot-toast";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FingerprintIcon from "@mui/icons-material/Fingerprint";

interface PasskeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  trustUnlocked?: boolean;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function PasskeySetup({
  isOpen,
  onClose,
  userId,
  onSuccess,
  trustUnlocked = false,
}: PasskeySetupProps) {
  const muiTheme = useTheme();
  const [step, setStep] = useState(trustUnlocked && ecosystemSecurity.status.isUnlocked ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [passkeyName, setPasskeyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const { rows } = await databases.use('chat').use('users').list({
          queries: (q) => [q.equal('username' as any, userId), q.limit(1)]
        });
        if (rows.length > 0 && (rows[0] as any).username) {
          setUsername((rows[0] as any).username);
        }
      } catch (error) {
        console.error("Failed to fetch username:", error);
      }
    };
    fetchUsername();
  }, [userId]);

  const verifyMasterPassword = async () => {
    // Enforcement: Check if master password exists before allowing verification/passkey setup
    const masterpassSet = await KeychainService.hasMasterpass(userId);
    if (!masterpassSet) {
      toast.error("You must set a master password before adding a passkey.");
      onClose();
      return false;
    }

    if (!masterPassword.trim()) {
      toast.error("Please enter your master password.");
      return false;
    }
    
    try {
      // Need to find the keychain entry for password
      const entries = await KeychainService.listKeychainEntries(userId);
      const passwordEntry = entries.find((e: any) => e.type === 'password');
      
      if (!passwordEntry) {
          toast.error("No master password setup found.");
          return false;
      }

      const isValid = await ecosystemSecurity.unlock(masterPassword, passwordEntry);
      if (isValid) {
        return true;
      } else {
        toast.error("Incorrect master password.");
        return false;
      }
    } catch (error: unknown) {
      console.error("Password verification failed:", error);
      toast.error("Failed to verify master password.");
      return false;
    }
  };

  const handleContinueToName = async () => {
    const isValid = await verifyMasterPassword();
    if (isValid) {
      setStep(2);
    }
  };

  const handleContinueToCreate = () => {
    if (!passkeyName.trim()) {
      toast.error("Please name your passkey.");
      return;
    }
    setStep(3);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const masterKey = ecosystemSecurity.getMasterKey();
      
      if (!masterKey) {
          throw new Error("Vault is locked. Please enter master password.");
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeBase64 = arrayBufferToBase64(challenge.buffer);

      const registrationOptions = {
        challenge: challengeBase64,
        rp: {
          name: "Kylrix",
          id: "kylrix.space",
        },
        user: {
          id: arrayBufferToBase64(new TextEncoder().encode(username || userId).buffer as ArrayBuffer),
          name: `@${username || userId}`,
          displayName: `@${username || userId}`,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" as const }, { alg: -257, type: "public-key" as const }],
        authenticatorSelection: {
          authenticatorAttachment: "platform" as const,
          residentKey: "required" as const,
          userVerification: "preferred" as const,
        },
        timeout: 60000,
        attestation: "none" as const,
      };

      const regResp = await startRegistration({ optionsJSON: registrationOptions });

      const encoder = new TextEncoder();
      const credentialData = encoder.encode(regResp.id + userId);
      const kwrapSeed = await crypto.subtle.digest("SHA-256", credentialData);
      const kwrap = await crypto.subtle.importKey(
        "raw",
        kwrapSeed,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      );

      const rawMasterKey = await crypto.subtle.exportKey("raw", masterKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedMasterKey = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        kwrap,
        rawMasterKey,
      );

      const combined = new Uint8Array(
        iv.length + encryptedMasterKey.byteLength,
      );
      combined.set(iv);
      combined.set(new Uint8Array(encryptedMasterKey), iv.length);
      const passkeyBlob = arrayBufferToBase64(combined.buffer);

      await KeychainService.createKeychainEntry({
        userId,
        type: 'passkey',
        credentialId: regResp.id,
        wrappedKey: passkeyBlob,
        salt: "", 
        params: JSON.stringify({
          name: passkeyName,
          publicKey: regResp.response.publicKey || "",
          counter: 0,
          transports: regResp.response.transports || [],
          created: new Date().toISOString(),
          rpId: "kylrix.space",
        }),
        isBackup: false
      });

      setStep(4);
    } catch (error: unknown) {
      console.error("Passkey setup failed:", error);
      const err = error as { name?: string; message?: string };
      const message =
        err.name === "InvalidStateError"
          ? "This passkey is already registered."
          : (error instanceof Error ? error.message : "Unknown error");
      toast.error(`Failed to create passkey: ${message}`);
    }
    setLoading(false);
  };

  const resetDialog = () => {
    setStep(1);
    setLoading(false);
    setMasterPassword("");
    setPasskeyName("");
    setShowPassword(false);
  };

  const handleClose = () => {
    if (userId) {
      localStorage.setItem(`passkey_skip_${userId}`, Date.now().toString());
    }
    resetDialog();
    onClose();
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: '28px',
          bgcolor: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(25px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage: 'none',
          width: '100%',
          maxWidth: '400px'
        }
      }}
    >
      <DialogTitle sx={{ 
        fontWeight: 900, 
        fontFamily: 'var(--font-space-grotesk)', 
        textAlign: 'center',
        pt: 4,
        pb: 1
      }}>
        Add New Passkey
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {step === 1 && (
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Step 1: Verify Master Password
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Please verify your master password to continue.
                </Typography>
              </Box>
              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                placeholder="Master Password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinueToName()}
                variant="filled"
                InputProps={{
                  disableUnderline: true,
                  sx: { borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.05)' },
                  endAdornment: (
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                      {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  )
                }}
              />
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Step 2: Name Passkey
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Give this passkey a name to identify it later.
                </Typography>
              </Box>
              <TextField
                fullWidth
                placeholder="Passkey Name"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinueToCreate()}
                variant="filled"
                autoFocus
                InputProps={{
                  disableUnderline: true,
                  sx: { borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.05)' }
                }}
              />
            </Stack>
          )}

          {step === 3 && (
            <Stack spacing={3} sx={{ textAlign: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Step 3: Create Passkey
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Click &ldquo;Create Passkey&rdquo; and follow your device&rsquo;s prompts.
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: '16px', 
                  bgcolor: 'rgba(0, 240, 255, 0.05)', 
                  border: '1px dashed rgba(0, 240, 255, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <FingerprintIcon sx={{ fontSize: 32, color: muiTheme.palette.primary.main }} />
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    Face ID • Touch ID • Windows Hello
                  </Typography>
                </Box>
              </Box>
            </Stack>
          )}

          {step === 4 && (
            <Stack spacing={3} sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                bgcolor: 'rgba(76, 175, 80, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mx: 'auto',
                mb: 1
              }}>
                <CheckCircleIcon sx={{ fontSize: 32, color: "#4CAF50" }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#4CAF50', mb: 1 }}>
                  Passkey Added!
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  You can now use <strong>{passkeyName}</strong> to unlock your session.
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 4, pt: 0, gap: 1.5 }}>
        {step === 2 && (
          <>
            <Button 
              onClick={handleClose} 
              variant="outlined" 
              fullWidth 
              sx={{ borderRadius: '12px', color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              Skip
            </Button>
            <Button
              onClick={handleContinueToCreate}
              disabled={!passkeyName.trim()}
              variant="contained"
              fullWidth
              sx={{ borderRadius: '12px' }}
            >
              Continue
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <Button
              variant="outlined"
              onClick={() => setStep(2)}
              disabled={loading}
              fullWidth
              sx={{ borderRadius: '12px', color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              Back
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={loading}
              variant="contained"
              fullWidth
              sx={{ borderRadius: '12px' }}
            >
              {loading ? <CircularProgress size={20} /> : "Create Passkey"}
            </Button>
          </>
        )}

        {step === 4 && (
          <Button
            onClick={() => {
              onSuccess();
              handleClose();
            }}
            variant="contained"
            fullWidth
            sx={{ borderRadius: '12px' }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
