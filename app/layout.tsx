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
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    images: ['/og-image.png'],
  }
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
import { SubscriptionProvider } from '@/context/subscription/SubscriptionContext';
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
        <SubscriptionProvider>
          <ThemeProvider>
            <IslandProvider>
              <NotificationProvider>
                <SudoProvider>
                  <PresenceProvider>
                    <AuthOverlay />
                    <Toaster 
                      position="bottom-right"
                      toastOptions={{
                        style: {
                          background: '#1A1A1A',
                          color: '#fff',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }
                      }}
                    />
                    <Suspense fallback={null}>
                      {children}
                    </Suspense>
                  </PresenceProvider>
                </SudoProvider>
              </NotificationProvider>
            </IslandProvider>
          </ThemeProvider>
        </SubscriptionProvider>
      </body>
    </html>
  );
}
                    }}
                  />
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
