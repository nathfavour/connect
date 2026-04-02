'use client';

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import { RefreshCw, ShieldAlert, Sparkles, X, Zap } from 'lucide-react';
import { DiagnosticIssue } from '@/lib/services/diagnostics';

interface ChatDiagnosticsDrawerProps {
  open: boolean;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusColor: string;
  issues: DiagnosticIssue[];
  tips: string[];
  checks: Array<{ label: string; value: string; tone?: string }>;
  livePulse?: string;
  probeSummary?: string;
  onClose: () => void;
  onRefresh?: () => void;
  onProbeAnotherMessage?: () => void;
}

export function ChatDiagnosticsDrawer({
  open,
  title,
  subtitle,
  statusLabel,
  statusColor,
  issues,
  tips,
  checks,
  livePulse,
  probeSummary,
  onClose,
  onRefresh,
  onProbeAnotherMessage,
}: ChatDiagnosticsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          bgcolor: '#161412',
          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundImage: 'none',
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <ShieldAlert size={18} color={statusColor} />
            <Chip
              size="small"
              label={statusLabel}
              sx={{
                bgcolor: alpha(statusColor, 0.12),
                color: statusColor,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            />
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'var(--font-clash)' }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.45)' }}>
          <X size={18} />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      <Box sx={{ p: 2.5, overflowY: 'auto' }}>
        {livePulse && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              bgcolor: alpha('#6366F1', 0.1),
              color: '#C7D2FE',
              border: '1px solid rgba(99, 102, 241, 0.18)',
              '& .MuiAlert-icon': { color: '#818CF8' },
            }}
          >
            {livePulse}
          </Alert>
        )}

        {probeSummary && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: alpha('#10B981', 0.06), border: '1px solid rgba(16, 185, 129, 0.12)' }}>
            <Typography variant="caption" sx={{ color: '#A7F3D0', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Probe Result
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.82)' }}>
              {probeSummary}
            </Typography>
          </Box>
        )}

        {!!issues.length && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 900 }}>
              Diagnostics
            </Typography>
            <List dense disablePadding>
              {issues.map((issue, index) => (
                <ListItem
                  key={`${issue.title}-${index}`}
                  sx={{
                    px: 0,
                    py: 1,
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemText
                    primary={issue.title}
                    secondary={issue.detail}
                    primaryTypographyProps={{
                      fontWeight: 800,
                      color: issue.severity === 'error' ? '#FCA5A5' : '#FDE68A',
                      fontSize: '0.9rem',
                    }}
                    secondaryTypographyProps={{
                      sx: { color: 'rgba(255,255,255,0.58)', mt: 0.25 },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 900 }}>
            Live Checks
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {checks.map((check) => (
              <Box
                key={check.label}
                sx={{
                  p: 1.25,
                  borderRadius: '12px',
                  bgcolor: '#0A0908',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 800 }}>
                  {check.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25, color: check.tone || 'white' }}>
                  {check.value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 900 }}>
            What To Try
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {tips.map((tip, index) => (
              <Box
                key={`${tip}-${index}`}
                sx={{
                  p: 1.25,
                  borderRadius: '12px',
                  bgcolor: alpha('#F59E0B', 0.06),
                  border: '1px solid rgba(245, 158, 11, 0.12)',
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)' }}>
                  {tip}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="contained"
              startIcon={<RefreshCw size={16} />}
              sx={{
                bgcolor: '#6366F1',
                color: 'white',
                fontWeight: 800,
                borderRadius: '12px',
                '&:hover': { bgcolor: '#4F46E5' },
              }}
            >
              Refresh Live Keys
            </Button>
          )}
          {onProbeAnotherMessage && (
            <Button
              onClick={onProbeAnotherMessage}
              variant="outlined"
              startIcon={<Sparkles size={16} />}
              sx={{
                borderColor: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontWeight: 800,
                borderRadius: '12px',
                '&:hover': { bgcolor: alpha('#ffffff', 0.05), borderColor: 'rgba(255,255,255,0.2)' },
              }}
            >
              Probe Another Message
            </Button>
          )}
        </Stack>

        <Box sx={{ mt: 2.5, p: 1.5, borderRadius: '12px', bgcolor: alpha('#6366F1', 0.05), border: '1px solid rgba(99, 102, 241, 0.08)' }}>
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 800, color: '#C7D2FE' }}>
            <Zap size={12} />
            Live pulse
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.72)' }}>
            This panel keeps watching for stale wraps, mismatched published keys, and messages that stay encrypted after unlock.
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
