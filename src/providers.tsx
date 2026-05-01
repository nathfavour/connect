"use client";

import React from 'react';
import { DataNexusProvider } from '@/context/DataNexusContext';
import { AuthProvider } from '@/context/auth/AuthContext';
import { SubscriptionProvider } from '@/context/subscription/SubscriptionContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AppChromeProvider } from '@/components/providers/AppChromeProvider';
import { PresenceProvider } from '@/components/providers/PresenceProvider';
import { ProfileProvider } from '@/components/providers/ProfileProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { ChatNotificationProvider } from '@/components/providers/ChatNotificationProvider';
import { IslandProvider } from '@/components/common/DynamicIsland';
import { SudoProvider } from '@/context/SudoContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
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
                        <AuthProvider>{children}</AuthProvider>
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
  );
}

export { AppProviders as Providers };
