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
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import { EcosystemService } from '@/lib/services/ecosystem';
import { useAuth } from '@/lib/auth';

interface NoteSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (note: any) => void;
}

export const NoteSelectorModal = ({ open, onClose, onSelect }: NoteSelectorModalProps) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (open && user) {
            loadNotes();
        }
    }, [open, user]);

    const loadNotes = async () => {
        if (!user?.$id) return;
        setLoading(true);
        try {
            const response = await EcosystemService.listNotes(user.$id);
            // Smart filter: only public notes
            const publicNotes = response.rows.filter((n: any) => n.isPublic === true);
            setNotes(publicNotes);
        } catch (error) {
            console.error('Failed to load notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredNotes = notes.filter(note => 
        note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 800 }}>Attach a Note</DialogTitle>
            <DialogContent dividers>
                <TextField
                    fullWidth
                    placeholder="Search your public notes..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon size={20} />
                            </InputAdornment>
                        ),
                    }}
                />
                
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : filteredNotes.length > 0 ? (
                    <List>
                        {filteredNotes.map((note) => (
                            <ListItem 
                                key={note.$id} 
                                component="div"
                                onClick={() => {
                                    onSelect(note);
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
                                    <DescriptionIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText 
                                    primary={note.title || 'Untitled Note'} 
                                    secondary={
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                            {note.content?.substring(0, 80).replace(/[#*`]/g, '')}...
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
                            {searchQuery ? 'No matching notes found.' : 'No public notes found.'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Only notes marked as "Public" in WhisperrNote can be attached.
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
