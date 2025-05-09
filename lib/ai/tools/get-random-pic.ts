import { z } from 'zod';
import { tool } from 'ai';

export const getRandomPic = tool({
  description: 'Get a random picture from the internet',
  parameters: z.object({}),
  execute: async ({}) => {
    const images = [
      'https://images.unsplash.com/photo-1551554424-90c98c19c5f5',
      'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf',
      'https://images.unsplash.com/photo-1560801514-704d01da7745',
      'https://images.unsplash.com/photo-1550152428-4fbab75a3b0e',
      'https://images.unsplash.com/photo-1574768900873-38a457de9b3c',
      'https://images.unsplash.com/photo-1512753360435-329c4535a9a7'
    ]

    return images[Math.floor(Math.random() * images.length)];
  },
});
