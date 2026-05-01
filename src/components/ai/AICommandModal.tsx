'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { useTask } from '@/context/TaskContext';
import { useAuth } from '@/context/auth/AuthContext';
import { events as eventApi } from '@/lib/kylrixflow';
import { permissions } from '@/lib/permissions';

interface AICommandModalProps {
  open: boolean;
  onClose: () => void;
}

type AIIntent = 'create_task' | 'create_event' | 'unknown';

interface TaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
}

interface EventData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
}

interface AIResponse {
  intent: AIIntent;
  data: TaskData & EventData; // Union or intersection for simplicity in handling
  summary: string;
}

export default function AICommandModal({ open, onClose }: AICommandModalProps) {
  const { generate } = useAI();
  const { addTask, projects, userId } = useTask();
  const { user } = useAuth();
  
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AIResponse | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    onClose();
    setPrompt('');
    setResult(null);
    setIsExecuting(false);
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);

    const systemPrompt = `
      You are an intelligent assistant for a productivity app.
      Analyze the user's request and extract the intent to create a "task" or an "event".
      
      Current Date: ${new Date().toISOString()}
      
      Return ONLY a valid JSON object with this structure:
      {
        "intent": "create_task" | "create_event" | "unknown",
        "summary": "A short summary of what will be created",
        "data": {
          // For tasks:
          "title": "string",
          "description": "string (optional)",
          "priority": "low" | "medium" | "high" | "urgent",
          "dueDate": "ISO date string (optional)",
          
          // For events:
          "title": "string",
          "description": "string (optional)",
          "startTime": "ISO date string",
          "endTime": "ISO date string",
          "location": "string (optional)"
        }
      }
      
      If the intent is unclear, set intent to "unknown".
    `;

    try {
      const response = await generate(`${systemPrompt}\n\nUser Request: ${prompt}`);
      
      // Clean up the response to ensure it's valid JSON
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      
      setResult(parsed);
    } catch (error: unknown) {
      console.error('AI Analysis failed', error);
      // Handle error (maybe show a snackbar)
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!result || !result.data) return;

    setIsExecuting(true);
    try {
      if (result.intent === 'create_task') {
        await addTask({
          title: result.data.title,
          description: result.data.description,
          priority: result.data.priority || 'medium',
          dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
          status: 'todo',
          labels: [],
          subtasks: [],
          comments: [],
          attachments: [],
          reminders: [],
          timeEntries: [],
          assigneeIds: [user?.$id || ''],
          projectId: 'inbox', // Default to inbox
          creatorId: user?.$id || 'guest',
          isArchived: false,
        });
      } else if (result.intent === 'create_event') {
        const currentUserId = userId || 'guest';
        const visibility = 'public'; // Default to public for now
        const eventPermissions = permissions.forVisibility(visibility, currentUserId);
        
        // Default duration if not specified or same as start
        const start = new Date(result.data.startTime);
        let end = new Date(result.data.endTime);
        if (isNaN(end.getTime()) || end <= start) {
            end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default
        }

        await eventApi.create(
          {
            title: result.data.title,
            description: result.data.description || '',
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            location: result.data.location || '',
            meetingUrl: '',
            visibility: visibility,
            status: 'confirmed',
            coverImageId: '',
            maxAttendees: 0,
            recurrenceRule: '',
            calendarId: projects[0]?.id || 'default',
            userId: currentUserId,
          },
          eventPermissions
        );
      }
      
      handleClose();
    } catch (error: unknown) {
      console.error('Execution failed', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          backgroundImage: 'none',
          backgroundColor: 'rgba(22, 20, 18, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 32px 64px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, pt: 3 }}>
        <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF', display: 'flex' }}>
          <Sparkles size={20} strokeWidth={1.5} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em', color: 'white' }}>
          AI ASSISTANT
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={handleClose} size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)', color: 'rgba(255, 255, 255, 0.4)', '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.08)' } }}>
          <X size={18} strokeWidth={1.5} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        {!result ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, fontWeight: 500 }}>
              Describe what you want to do, and I&apos;ll help you create it.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              placeholder="e.g., 'Schedule a team meeting for next Tuesday at 2 PM'..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: { 
                  p: 2, 
                  borderRadius: '16px', 
                  bgcolor: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '1rem',
                  color: 'white',
                  fontFamily: 'var(--font-inter)',
                  '&:focus-within': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                },
              }}
            />
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 2, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Detected Intent
            </Typography>
            
            <Card variant="outlined" sx={{ borderRadius: '20px', bgcolor: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.08)', position: 'relative', overflow: 'visible' }}>
              <Box
                sx={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  bgcolor: '#4CAF50',
                  color: 'black',
                  borderRadius: '50%',
                  p: 0.5,
                  display: 'flex',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                  border: '2px solid #0F0D0C'
                }}
              >
                <CheckCircle2 size={16} strokeWidth={3} />
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Chip 
                    label={result.intent === 'create_task' ? 'TASK' : 'EVENT'} 
                    size="small"
                    sx={{
                      bgcolor: result.intent === 'create_task' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                      color: result.intent === 'create_task' ? '#6366F1' : '#A855F7',
                      fontWeight: 900,
                      fontSize: '0.65rem',
                      borderRadius: '6px',
                      border: '1px solid'
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'var(--font-space-grotesk)', color: 'white' }}>
                    {result.data.title}
                  </Typography>
                </Box>
                
                {result.data.description && (
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                    <FileText size={18} strokeWidth={1.5} />
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{result.data.description}</Typography>
                  </Box>
                )}

                {(result.data.dueDate || result.data.startTime) && (
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                    <Clock size={18} strokeWidth={1.5} />
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {result.intent === 'create_task' && result.data.dueDate
                        ? new Date(result.data.dueDate).toLocaleString()
                        : result.intent === 'create_event'
                        ? `${new Date(result.data.startTime).toLocaleString()} - ${new Date(result.data.endTime).toLocaleTimeString()}`
                        : ''
                      }
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            <Typography variant="caption" sx={{ display: 'block', mt: 3, textAlign: 'center', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 600 }}>
              {result.summary}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
        {!result ? (
          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={!prompt.trim() || isLoading}
            fullWidth
            sx={{
              borderRadius: '12px',
              bgcolor: '#6366F1',
              color: 'black',
              fontWeight: 900,
              py: 1.5,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.2)',
              '&:hover': { bgcolor: '#00D1DA', boxShadow: '0 12px 28px rgba(99, 102, 241, 0.3)' }
            }}
          >
            {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Analyze Intent'}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={() => setResult(null)}
              fullWidth
              sx={{ 
                borderRadius: '12px', 
                borderColor: 'rgba(255, 255, 255, 0.1)', 
                color: 'white', 
                fontWeight: 700,
                '&:hover': { borderColor: 'rgba(255, 255, 255, 0.3)', bgcolor: 'rgba(255, 255, 255, 0.05)' }
              }}
            >
              TRY AGAIN
            </Button>
            <Button
              variant="contained"
              onClick={handleExecute}
              disabled={isExecuting}
              fullWidth
              sx={{
                borderRadius: '12px',
                bgcolor: '#6366F1',
                color: 'black',
                fontWeight: 900,
                textTransform: 'uppercase',
                '&:hover': { bgcolor: '#00D1DA' }
              }}
            >
              {isExecuting ? 'INITIALIZING...' : 'CONFIRM & CREATE'}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
