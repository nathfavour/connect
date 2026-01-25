import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
};

export default nextConfig;
