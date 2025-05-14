import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';

interface AssetsAnalysisReportInfoProps {
  dataStream: DataStreamWriter;
}

export const createAssetsAnalysisReport = ({ dataStream }: AssetsAnalysisReportInfoProps) =>
  tool({
    description: 'Crea el análisis de activos y pasivos de la empresa',
    parameters: z.object({
      query: z.string()
    }),
    execute: async ({ query }) => {
      try {
        const url = `${process.env.ASSETS_ANALYSIS_AGENT_API_URL}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          console.error('API request failed with status', response.status);
        }

        const data = await response.json();
        const result = data['final_response'];

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
