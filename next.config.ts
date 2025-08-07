import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ဒီနေရာမှာ အောက်ကတစ်ကြောင်းကို ပေါင်းထည့်လိုက်ပါ
  output: 'export',

  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const, // For stricter TypeScript, add 'as const'
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
