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
      {
        hostname: 'agentgraficas2.azurewebsites.net'
      },
      {
        hostname: 'agent347-2.azurewebsites.net'
      },
      {
        hostname: 'agent303try2.azurewebsites.net'
      },
      {
        hostname: 'agent347try2.blob.core.windows.net'
      },
      {
        hostname: 'xfunhkigyquwi0rb.public.blob.vercel-storage.com'
      }
    ],
  },
};

export default nextConfig;
