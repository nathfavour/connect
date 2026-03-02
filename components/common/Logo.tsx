import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

export type KylrixApp = 'root' | 'vault' | 'flow' | 'note' | 'connect';

interface LogoProps {
  sx?: any;
  size?: number;
  app?: KylrixApp;
  variant?: 'full' | 'icon';
  component?: any;
  href?: string;
}

const LogoContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  transition: 'all 0.3s ease',
  textDecoration: 'none'
});

const Logo: React.FC<LogoProps> = ({ 
  sx, 
  size = 40, 
  app = 'connect', 
  variant = 'full',
  component,
  href
}) => {
  const configs = {
    root: { color1: "#00F5FF", color2: "#00A3FF", name: "KYLRIX", desc: "Ecosystem Hub" },
    vault: { color1: "#00F5FF", color2: "#222222", name: "VAULT", desc: "Zero-Knowledge Storage" },
    flow: { color1: "#00FF94", color2: "#00B2FF", name: "FLOW", desc: "AI Orchestration" },
    note: { color1: "#6366F1", color2: "#A855F7", name: "NOTE", desc: "Structured Intelligence" },
    connect: { color1: "#F43F5E", color2: "#FB923C", name: "CONNECT", desc: "P2P Encryption" }
  };

  const current = configs[app];

  return (
    <LogoContainer sx={sx} component={component} href={href}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`grad-${app}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={current.color1} />
            <stop offset="100%" stopColor={current.color2} />
          </linearGradient>
          <filter id="glow-heavy"><feGaussianBlur stdDeviation="4" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
        </defs>

        {app === 'connect' && (
          <>
            <path d="M30 20V80" stroke={`url(#grad-${app})`} strokeWidth="6" strokeLinecap="round" opacity="0.3" />
            <path d="M70 20L35 50L70 80" stroke={`url(#grad-${app})`} strokeWidth="6" strokeLinecap="round" opacity="0.3" />
            <circle cx="30" cy="20" r="8" fill={`url(#grad-${app})`} filter="url(#glow-heavy)" />
            <circle cx="30" cy="80" r="8" fill={`url(#grad-${app})`} filter="url(#glow-heavy)" />
            <circle cx="70" cy="20" r="8" fill={`url(#grad-${app})`} filter="url(#glow-heavy)" />
            <circle cx="70" cy="80" r="8" fill={`url(#grad-${app})`} filter="url(#glow-heavy)" />
            <circle cx="35" cy="50" r="12" fill="#fff" filter="url(#glow-heavy)" />
          </>
        )}
        
        {(app === 'root' || app === 'vault' || app === 'flow' || app === 'note') && (
           <g>
             <path d="M30 20V80" stroke={`url(#grad-${app})`} strokeWidth="10" strokeLinecap="round" />
             <path d="M70 20L35 50L70 80" stroke={`url(#grad-${app})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
             <circle cx="35" cy="50" r="5" fill="#fff" />
           </g>
        )}
      </svg>
      {variant === 'full' && (
        <Box>
          <Typography sx={{ fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', fontSize: `${size * 0.7}px`, lineHeight: 1, textTransform: 'uppercase', fontFamily: 'inherit' }}>
            {current.name}
          </Typography>
        </Box>
      )}
    </LogoContainer>
  );
};

export default Logo;
