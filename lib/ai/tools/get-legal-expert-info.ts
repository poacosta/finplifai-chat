import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';

interface GetLegalExpertInfoProps {
  dataStream: DataStreamWriter;
}

export const getLegalExpertInfo = ({ dataStream }: GetLegalExpertInfoProps) =>
  tool({
    description: 'Obtains information about the economic laws and regulations of Spain',
    parameters: z.object({
      query: z.string()
    }),
    execute: async ({ query }) => {
      try {
        const url = `${process.env.LEGAL_EXPERT_API_URL}`;
        const token = `Bearer ${process.env.LEGAL_EXPERT_API_KEY || ''}`;

        console.log('Loading legal expert info from database...');

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          console.error('API request failed with status', response.status);
        }

        const data = await response.json();
        const result = data['result'];

        dataStream.writeData({
          type: 'text-delta',
          content: result,
        })

        return result;
      } catch (error) {
        console.error('Error fetching legal expert info:', error);
        dataStream.writeData({
          type: 'error',
          content: 'Failed to load legal expert information. Please try again later.',
        });
      }
    },
  });
