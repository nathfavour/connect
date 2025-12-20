import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhisperrConnect - Elite Communication",
  description: "Seamless, secure, and glassmorphic connections for the Whisperr ecosystem.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

import { AuthOverlay } from '@/components/auth/AuthOverlay';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthOverlay />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
