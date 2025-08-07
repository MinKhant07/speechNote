import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ဒီတစ်ကြောင်းကို ထပ်ထည့်ပေးပါ
  output: 'export',

  // တခြား config တွေ ဒီမှာရှိနိုင်ပါတယ်
};

export default nextConfig;
