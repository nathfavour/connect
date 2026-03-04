"use client";

import React, { useEffect, useState } from "react";
import { useSudo } from "@/context/SudoContext";
import { Box, Typography, Button, CircularProgress, alpha } from "@mui/material";
import { Shield } from "lucide-react";

interface SudoGuardProps {
    children: React.ReactNode;
}

export default function SudoGuard({ children }: SudoGuardProps) {
    const { requestSudo, isUnlocked } = useSudo();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    if (!isUnlocked) {
        return (
            <Box
                sx={{
                    minHeight: "400px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 4,
                    textAlign: "center",
                    borderRadius: "24px",
                    bgcolor: "rgba(255, 255, 255, 0.02)",
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                }}
            >
                <Box
                    sx={{
                        p: 2,
                        borderRadius: "16px",
                        bgcolor: alpha("#6366F1", 0.1),
                        color: "#6366F1",
                        mb: 3,
                    }}
                >
                    <Shield size={48} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                    Security Verification
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "rgba(255, 255, 255, 0.5)", mb: 4, maxWidth: "300px" }}
                >
                    Please verify your identity to access end-to-end encrypted data.
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => requestSudo({ onSuccess: () => {} })}
                    sx={{
                        bgcolor: "#6366F1",
                        color: "#000",
                        fontWeight: 700,
                        px: 4,
                        py: 1.5,
                        borderRadius: "12px",
                        '&:hover': { bgcolor: alpha("#6366F1", 0.8) }
                    }}
                >
                    Verify Identity
                </Button>
            </Box>
        );
    }

    return <>{children}</>;
}
