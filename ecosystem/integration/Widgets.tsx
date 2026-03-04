"use client";

import React, { useState } from 'react';
import { Box, TextField, IconButton, Paper, Typography, alpha, LinearProgress } from '@mui/material';
import { Send as SendIcon, Description as NoteIcon, Shield as ShieldIcon, Timer as TimerIcon } from '@mui/icons-material';

const QuickNote = () => {
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#6366F1', 0.1), color: '#6366F1' }}><NoteIcon sx={{ fontSize: 20 }} /></Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Quick Note</Typography>
            </Box>
            <TextField fullWidth placeholder="Save from chat..." variant="standard" InputProps={{ disableUnderline: true, sx: { color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8125rem' } }} />
        </Paper>
    );
};

const VaultStatus = () => {
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B' }}><ShieldIcon sx={{ fontSize: 20 }} /></Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Vault Status</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800 }}>ACTIVE SESSION</Typography>
        </Paper>
    );
};

const FocusStatus = () => {
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}><TimerIcon sx={{ fontSize: 20 }} /></Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>Flow Timer</Typography>
            </Box>
            <LinearProgress variant="determinate" value={60} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }} />
        </Paper>
    );
};

import { MiniChat } from '../contributions/MiniChat';
import { Grid } from '@mui/material';

export const EcosystemWidgets = () => {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 900, letterSpacing: '0.2em', mb: 2, display: 'block' }}>Ecosystem Status</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}><QuickNote /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><MiniChat /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><VaultStatus /></Grid>
                <Grid size={{ xs: 12, md: 6 }}><FocusStatus /></Grid>
            </Grid>
        </Box>
    );
};
