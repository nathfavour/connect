'use client';

import React, { useState, useEffect } from 'react';
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
    Box,
    CircularProgress,
    TextField,
    alpha
} from '@mui/material';
import NoteIcon from '@mui/icons-material/DescriptionOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import { EcosystemService } from '@/lib/services/ecosystem';
import { useAuth } from '@/lib/auth';
import { ecosystemSecurity } from '@/lib/ecosystem/security';
import { MasterPassModal } from './MasterPassModal';

interface NoteSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (note: any) => void;
}

export const NoteSelectorModal = ({ open, onClose, onSelect }: NoteSelectorModalProps) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [pendingSelection, setPendingSelection] = useState<any>(null);

    useEffect(() => {
        if (open && user) {
            loadNotes();
        }
    }, [open, user]);

    const loadNotes = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await EcosystemService.listNotes(user.$id);
            setNotes(res.rows);
        } catch (error) {
            console.error('Failed to load notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (note: any) => {
        if (!ecosystemSecurity.status.isUnlocked) {
            setPendingSelection(note);
            setUnlockModalOpen(true);
            return;
        }

        try {
            // Decrypt note title for display in chat if needed, 
            // but usually we just send the ID or a snippet.
            // The user requested to attach the note.
            onSelect(note);
            onClose();
        } catch (error) {
            console.error('Failed to process note selection:', error);
        }
    };

    const filteredNotes = notes.filter(note => {
        // Note: Title might be encrypted, but let's assume we can't search easily if it is.
        // Some notes might have plaintext titles if they were migrated or public.
        // In this UI, we might only see "[Encrypted Note]" if locked.
        return true; 
    });

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        bgcolor: 'rgba(15, 15, 15, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundImage: 'none',
                        width: '100%',
                        maxWidth: '500px',
                        minHeight: '400px'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontFamily: 'var(--font-space-grotesk)' }}>
                    Attach Note
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ mb: 2, mt: 1 }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                            sx: { borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.05)' }
                        }}
                    />

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <List sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {filteredNotes.length === 0 ? (
                                <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                    No notes found.
                                </Typography>
                            ) : (
                                filteredNotes.map((note) => (
                                    <ListItem 
                                        key={note.$id} 
                                        component="div"
                                        onClick={() => handleSelect(note)}
                                        sx={{ 
                                            borderRadius: '12px', 
                                            mb: 1, 
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
                                        }}
                                    >
                                        <ListItemIcon>
                                            <NoteIcon sx={{ color: 'primary.main' }} />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={note.title || 'Untitled Note'} 
                                            secondary={new Date(note.updatedAt).toLocaleDateString()}
                                            primaryTypographyProps={{ fontWeight: 600 }}
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancel</Button>
                </DialogActions>
            </Dialog>

            <MasterPassModal 
                open={unlockModalOpen} 
                onClose={() => setUnlockModalOpen(false)} 
                onSuccess={() => {
                    if (pendingSelection) {
                        onSelect(pendingSelection);
                        setPendingSelection(null);
                        onClose();
                    }
                }}
            />
        </>
    );
};
