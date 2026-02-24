import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
  poweredByHeader: false,
  reactCompiler: true,
  experimental: {
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      'lucide-react',
      'date-fns',
    ],
  },

  // Security Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.kylrix.space", 
              "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://api.fontshare.com",
              "object-src 'none'",
              "connect-src 'self' https://*.kylrix.space https://*.appwrite.io https://*.appwrite.global",
              "frame-ancestors 'self' https://*.kylrix.space",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Force HTTPS (HSTS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Prevent DNS Prefetching
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // XSS Protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
