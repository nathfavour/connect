"use client";

import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography, 
  Avatar,
  Badge,
  alpha 
} from '@mui/material';
import { 
  Send as SendIcon, 
  Chat as ChatIcon,
  Circle as CircleIcon
} from '@mui/icons-material';

/**
 * MiniChat Contribution
 * A miniaturized chat widget that allows quick replies from anywhere in the ecosystem.
 */
export const MiniChat = () => {
    const [message, setMessage] = useState('');
    
    const recentContact = {
        name: "Alex Rivera",
        status: "online",
        lastMessage: "Hey, did you see the new flow docs?"
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(124, 58, 237, 0.3)', // Connect Purple/Teal
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    sx={{
                        '& .MuiBadge-badge': {
                            backgroundColor: '#10b981',
                            color: '#10b981',
                            boxShadow: '0 0 0 2px #000',
                        }
                    }}
                >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#7c3aed', fontSize: '0.75rem', fontWeight: 800 }}>AR</Avatar>
                </Badge>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'white' }} noWrap>
                        {recentContact.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }} noWrap>
                        {recentContact.lastMessage}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    fullWidth
                    placeholder="Reply..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    variant="standard"
                    InputProps={{
                        disableUnderline: true,
                        sx: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '0.8125rem',
                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            px: 1.5,
                            py: 0.5
                        }
                    }}
                />
                <IconButton 
                    size="small"
                    sx={{ 
                        color: '#7c3aed',
                        bgcolor: alpha('#7c3aed', 0.1),
                        '&:hover': { bgcolor: alpha('#7c3aed', 0.2) }
                    }}
                >
                    <SendIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Box>
        </Paper>
    );
};
