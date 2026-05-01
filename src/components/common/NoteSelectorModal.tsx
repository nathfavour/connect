'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  X,
  Search as SearchIcon,
  FileText,
} from 'lucide-react';
import { notes as notesApi } from '@/lib/kylrixflow';

interface Note {
  $id: string;
  title: string;
  content: string;
}

interface NoteSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (noteId: string) => void;
}

export function NoteSelectorModal({ isOpen, onClose, onSelect }: NoteSelectorModalProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchNotes = async () => {
        setLoading(true);
        try {
          const res = await notesApi.list();
          setNotes((res.rows || (res as any).documents) as any[]);
        } catch (error: unknown) {
          console.error('Failed to fetch notes:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchNotes();
    }
  }, [isOpen]);

  const filteredNotes = notes.filter(note =>
    (note.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (note.content || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          backgroundImage: 'none',
          backgroundColor: 'rgba(15, 13, 12, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: 'white', fontFamily: 'var(--font-space-grotesk)' }}>
            ATTACH NOTE
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Resource from Kylrix Note
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)', color: 'rgba(255, 255, 255, 0.4)', '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.08)' } }}>
          <X size={18} strokeWidth={1.5} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Box sx={{ minHeight: '300px', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="filled"
            InputProps={{
              disableUnderline: true,
              sx: { borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={18} strokeWidth={1.5} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                </InputAdornment>
              ),
            }}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress size={24} sx={{ color: '#6366F1' }} />
            </Box>
          ) : filteredNotes.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.2 }}>
              <FileText size={48} strokeWidth={1} />
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>No notes found</Typography>
            </Box>
          ) : (
            <List sx={{ flex: 1, overflowY: 'auto' }}>
              {filteredNotes.map((note) => (
                <ListItemButton
                  key={note.$id}
                  onClick={() => onSelect(note.$id)}
                  sx={{
                    borderRadius: '12px',
                    mb: 1,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'rgba(99, 102, 241, 0.05)',
                      borderColor: 'rgba(99, 102, 241, 0.2)',
                      transform: 'translateX(4px)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <FileText size={20} color="#6366F1" strokeWidth={1.5} />
                  </ListItemIcon>
                  <ListItemText
                    primary={note.title || 'Untitled Note'}
                    secondary={note.content ? (note.content.substring(0, 60) + '...') : ''}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: 'white',
                      fontFamily: 'var(--font-space-grotesk)'
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontWeight: 500
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
