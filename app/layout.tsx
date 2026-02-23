import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kylrix Connect - Premium Communication",
  description: "Seamless, secure, and professional connections for the Kylrix Premium Suite.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthOverlay } from '@/components/auth/AuthOverlay';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { PresenceProvider } from '@/components/providers/PresenceProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { EcosystemClient } from '@/components/ecosystem/EcosystemClient';
import { IslandProvider } from '@/components/common/DynamicIsland';
import { SudoProvider } from '@/context/SudoContext';
import { Suspense } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={mono.variable}>
      <head>
        {/* THE KYLRIX SIGNATURE TRIO: Satoshi (Body) & Clash Display (Headings) */}
        <link 
          href="https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&f[]=satoshi@300,400,500,700,900&display=swap" 
          rel="stylesheet" 
        />
        <link rel="preconnect" href="https://fra.cloud.appwrite.io" />
      </head>
      <body className="antialiased">
        <EcosystemClient nodeId="connect" />
        <ThemeProvider>
          <IslandProvider>
            <NotificationProvider>
              <SudoProvider>
                <PresenceProvider>
                  <AuthOverlay />
                  <Suspense fallback={null}>
                    {children}
                  </Suspense>
                </PresenceProvider>
              </SudoProvider>
            </NotificationProvider>
          </IslandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
