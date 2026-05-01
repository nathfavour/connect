"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Paper, 
  Typography, 
  LinearProgress,
  alpha 
} from '@mui/material';
import { 
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

/**
 * FocusStatus Contribution
 * Provides focus timer control and visibility across the ecosystem.
 */
export const FocusStatus = () => {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(1500); // 25 mins

    useEffect(() => {
        let interval: any;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0 && isActive) {
            requestAnimationFrame(() => {
                setIsActive(false);
            });
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const progress = ((1500 - timeLeft) / 1500) * 100;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'all 0.3s ease',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                        p: 1, 
                        borderRadius: '10px', 
                        bgcolor: alpha('#3b82f6', 0.1),
                        color: '#3b82f6'
                    }}>
                        <TimerIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }}>
                        Focus Session
                    </Typography>
                </Box>
                <IconButton 
                    size="small"
                    onClick={() => setIsActive(!isActive)}
                    sx={{ 
                        color: '#3b82f6',
                        bgcolor: alpha('#3b82f6', 0.1),
                        '&:hover': { bgcolor: alpha('#3b82f6', 0.2) }
                    }}
                >
                    {isActive ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayIcon sx={{ fontSize: 18 }} />}
                </IconButton>
            </Box>

            <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', letterSpacing: '0.05em' }}>
                      {formatTime(timeLeft)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700 }}>
                      DEEP WORK
                  </Typography>
                </Box>
                <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                        height: 4, 
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: '#3b82f6',
                            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                        }
                    }}
                />
            </Box>
        </Paper>
    );
};
