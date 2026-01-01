import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhisperrConnect - Premium Communication",
  description: "Seamless, secure, and professional connections for the Whisperr Premium Suite.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthOverlay } from '@/components/auth/AuthOverlay';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="preconnect" href="https://fra.cloud.appwrite.io" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthOverlay />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
