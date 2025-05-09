import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'picsum.photos'
      },
      {
        hostname: 'placehold.co'
      },
      {
        hostname: 'images.unsplash.com'
      },
    ],
  },
};

export default nextConfig;
