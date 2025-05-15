import { z } from 'zod';
import { tool, DataStreamWriter } from 'ai';

interface DisplayImageToolProps {
  dataStream?: DataStreamWriter;
}

export const displayImage = ({ dataStream }: DisplayImageToolProps = {}) =>
  tool({
    description: 'Displays an image in the chat from a provided URL',
    parameters: z.object({
      imageUrl: z.string().describe('URL of the image to display'),
    }),
    execute: async ({ imageUrl }) => {
      try {
        new URL(imageUrl);

        if (dataStream) {
          dataStream.writeData({
            type: 'status',
            content: `Processing image: ${imageUrl}`,
          });
        }

        return imageUrl;
      } catch (error) {
        console.error('Error processing image URL:', error);
        return 'https://images.unsplash.com/photo-1512753360435-329c4535a9a7'; // Fallback image
      }
    },
  });
