import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/router-core';
import type { ReactNode } from 'react';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { Toaster } from 'react-hot-toast';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import appCss from '../globals.css?url';
import { EcosystemClient } from '@/components/ecosystem/EcosystemClient';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AppChromeProvider } from '@/components/providers/AppChromeProvider';
import { PresenceProvider } from '@/components/providers/PresenceProvider';
import { ProfileProvider } from '@/components/providers/ProfileProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { ChatNotificationProvider } from '@/components/providers/ChatNotificationProvider';
import { AuthOverlay } from '@/components/auth/AuthOverlay';
import { IslandProvider } from '@/components/common/DynamicIsland';
import { SudoProvider } from '@/context/SudoContext';
import { SubscriptionProvider } from '@/context/subscription/SubscriptionContext';
import { DataNexusProvider } from '@/context/DataNexusContext';

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Kylrix Connect' },
      { name: 'description', content: 'Kylrix Connect on TanStack Start.' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootErrorComponent({ error, info, reset }: ErrorComponentProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', p: 3 }}>
      <Paper sx={{ p: 3, bgcolor: '#161412', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>App error</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{error.message}</Typography>
          <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)' }}>
            {error.stack}
            {'\n'}
            {info?.componentStack}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={reset}>Retry</Button>
            <Button variant="outlined" onClick={() => window.location.reload()}>Reload</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <EcosystemClient nodeId="connect" />
        <DataNexusProvider>
          <SubscriptionProvider>
            <ThemeProvider>
              <AppChromeProvider>
                <SudoProvider>
                  <IslandProvider>
                    <NotificationProvider>
                      <ProfileProvider>
                        <PresenceProvider>
                          <ChatNotificationProvider>
                            <AuthOverlay />
                            <Toaster position="bottom-right" toastOptions={{ style: { background: '#1A1A1A', color: '#fff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' } }} />
                            {children}
                          </ChatNotificationProvider>
                        </PresenceProvider>
                      </ProfileProvider>
                    </NotificationProvider>
                  </IslandProvider>
                </SudoProvider>
              </AppChromeProvider>
            </ThemeProvider>
          </SubscriptionProvider>
        </DataNexusProvider>
        <Scripts />
        <TanStackDevtools config={{ position: 'bottom-right' }} plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]} />
      </body>
    </html>
  );
}
