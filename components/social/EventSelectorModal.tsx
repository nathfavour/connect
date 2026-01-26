'use client';

import React, { useEffect, useState } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    List, 
    ListItem, 
    ListItemText, 
    ListItemIcon,
    Typography,
    CircularProgress,
    Box,
    TextField,
    InputAdornment
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import { EcosystemService } from '@/lib/services/ecosystem';
import { useAuth } from '@/lib/auth';

interface EventSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (event: any) => void;
}

export const EventSelectorModal = ({ open, onClose, onSelect }: EventSelectorModalProps) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (open && user) {
            loadEvents();
        }
    }, [open, user]);

    const loadEvents = async () => {
        if (!user?.$id) return;
        setLoading(true);
        try {
            const response = await EcosystemService.listEvents(user.$id);
            // Smart filter: ONLY public events from WhisperrFlow
            const publicEvents = response.rows.filter((e: any) => e.visibility === 'public');
            setEvents(publicEvents);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEvents = events.filter(event => 
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 800 }}>Attach an Event</DialogTitle>
            <DialogContent dividers>
                <TextField
                    fullWidth
                    placeholder="Search your events..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }}
                />
                
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : filteredEvents.length > 0 ? (
                    <List>
                        {filteredEvents.map((event) => (
                            <ListItem 
                                key={event.$id} 
                                component="div"
                                onClick={() => {
                                    onSelect(event);
                                    onClose();
                                }}
                                sx={{ 
                                    cursor: 'pointer', 
                                    borderRadius: 2,
                                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                                    mb: 1,
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <ListItemIcon>
                                    <EventIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={event.title || 'Untitled Event'} 
                                    secondary={
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                            {new Date(event.startTime).toLocaleString()} • {event.location || 'No location'}
                                        </Typography>
                                    }
                                    primaryTypographyProps={{ fontWeight: 700 }}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                            {searchQuery ? 'No matching public events found.' : 'No public events found.'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Only events marked as "Public" in WhisperrFlow can be shared in the ecosystem feed.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};
