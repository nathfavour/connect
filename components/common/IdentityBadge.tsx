'use client';

import { Box, Typography, alpha, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatVerificationTooltip, getVerificationState } from '@/lib/verification';

const RING_COLORS = ['#6366F1', '#EC4899', '#10B981', '#A855F7', '#F59E0B'];
const RING_GRADIENT = `conic-gradient(from 180deg, ${RING_COLORS.join(', ')}, #6366F1)`;

export interface IdentitySignals {
  createdAt?: string | null;
  lastUsernameEdit?: string | null;
  profilePicId?: string | null;
  username?: string | null;
  bio?: string | null;
  tier?: string | null;
  publicKey?: string | null;
  emailVerified?: boolean | null;
  preferences?: string | Record<string, any> | null;
}

export function computeIdentityFlags(signals: IdentitySignals) {
  const verification = getVerificationState(signals.preferences || null);
  const pro = String(signals.tier || '').toUpperCase() === 'PRO';
  return { verified: verification.verified, verifiedOn: verification.verifiedOn, pro };
}

export function IdentityAvatar({
  src,
  alt,
  fallback,
  verified,
  verifiedOn,
  pro,
  size = 40,
  verifiedSize = 16,
  borderRadius = '50%',
}: {
  src?: string | null;
  alt?: string;
  fallback?: string;
  verified?: boolean;
  verifiedOn?: string | null;
  pro?: boolean;
  size?: number;
  verifiedSize?: number;
  borderRadius?: string | number;
}) {
  const verifiedTooltip = formatVerificationTooltip({
    verified: Boolean(verified),
    verifiedOn: verifiedOn || null,
    checkedAt: verifiedOn || null,
    method: null,
    source: null,
  });

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius,
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        ...(pro
          ? {
              padding: '2px',
              background: RING_GRADIENT,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 0 18px rgba(99,102,241,0.18)',
            }
          : {
              padding: '0px',
            }),
      }}
    >
      <Box
        component="img"
        src={src || undefined}
        alt={alt || ''}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: `calc(${typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius} - 2px)`,
          objectFit: 'cover',
          display: src ? 'block' : 'none',
        }}
      />
      {!src && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: `calc(${typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius} - 2px)`,
            bgcolor: alpha('#6366F1', 0.12),
            color: '#6366F1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: `${Math.max(11, size / 3)}px`,
          }}
        >
          {fallback || 'U'}
        </Box>
      )}
      {verified && (
        <Tooltip title={verifiedTooltip} arrow>
          <Box
            sx={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: verifiedSize,
              height: verifiedSize,
              borderRadius: '50%',
              bgcolor: '#0A0908',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 0 2px rgba(10,9,8,1)',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: verifiedSize, color: '#6366F1' }} />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

export function IdentityName({
  children,
  verified,
  verifiedOn,
  sx,
}: {
  children: React.ReactNode;
  verified?: boolean;
  verifiedOn?: string | null;
  sx?: Record<string, unknown>;
}) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, ...(sx || {}) }}>
      <Typography component="span" sx={{ lineHeight: 1 }}>
        {children}
      </Typography>
      {verified && (
        <Tooltip title={verifiedTooltipText(verifiedOn)} arrow>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 16, color: '#6366F1', flexShrink: 0 }} />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

function verifiedTooltipText(verifiedOn?: string | null) {
  return verifiedOn ? `Verified on ${new Date(verifiedOn).toLocaleString()}` : 'Verified';
}
