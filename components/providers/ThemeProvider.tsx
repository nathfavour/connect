'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEcosystemNode } from '@/hooks/useEcosystemNode';

type ColorModeContextType = {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
};

const ColorModeContext = createContext<ColorModeContextType>({ toggleColorMode: () => { }, mode: 'light' });

export const useColorMode = () => useContext(ColorModeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEcosystemNode('connect');

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('kylrixconnect-theme') as 'light' | 'dark' | null;
    if (saved) {
      setMode(saved);
    } else {
      setMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, [prefersDarkMode]);

  useEffect(() => {
    localStorage.setItem('kylrixconnect-theme', mode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#00F0FF', // Electric Teal
            contrastText: '#000000',
          },
          secondary: {
            main: '#F2F2F2', // Titanium
          },
          background: {
            default: '#000000', // The Void
            paper: '#0A0A0A',   // The Surface
          },
          text: {
            primary: '#F2F2F2',   // Titanium
            secondary: '#A1A1AA', // Gunmetal
            disabled: '#404040',  // Carbon
          },
          divider: '#222222', // Subtle Border
        },
        shape: {
          borderRadius: 12,
        },
        typography: {
          fontFamily: 'var(--font-satoshi), "Satoshi", sans-serif',
          h1: {
            fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#F2F2F2',
          },
          h2: {
            fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
            fontSize: '24px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          },
          h3: {
            fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
            fontSize: '20px',
            fontWeight: 600,
          },
          button: {
            fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: '#000000',
                color: '#F2F2F2',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid #222222',
                boxShadow: 'none',
              }
            }
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: '#000000',
                borderRight: '1px solid #222222',
              }
            }
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: '8px 16px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid #222222',
                '&:hover': {
                  borderColor: '#404040',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              },
              containedPrimary: {
                backgroundColor: '#00F0FF',
                color: '#000000',
                border: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(0, 240, 255, 0.8)',
                  boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                },
              },
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                backgroundColor: 'rgba(10, 10, 10, 0.7)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundImage: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: '#404040',
                  transform: 'translateY(-2px)',
                },
              }
            }
          }
        }
      }),
    [],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
};
