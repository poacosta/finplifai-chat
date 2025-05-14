import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';

interface AssetsAnalysisReportInfoProps {
  dataStream: DataStreamWriter;
}

export const createAssetsAnalysisReport = ({ dataStream }: AssetsAnalysisReportInfoProps) =>
  tool({
    description: 'Crea el análisis de activos y pasivos de la empresa basado en un archivo',
    parameters: z.object({
      fileId: z.string().describe('ID del archivo a analizar')
    }),
    execute: async ({ fileId }) => {
      try {
        const fileUrl = fileId.startsWith('http') ? fileId : `https://${process.env.VERCEL_BLOB_STORE_ID}.public.blob.vercel-storage.com/${fileId}`;

        const url = `${process.env.ASSETS_ANALYSIS_AGENT_API_URL}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: fileUrl }),
        });

        if (!response.ok) {
          console.error('API request failed with status', response.status);
        }

        const data = await response.json();
        const result = data['markdown_content'];

        dataStream.writeData({
          type: 'text-delta',
          content: result,
        });

        return result;
      } catch (error) {
        console.error('Error fetching assets analysis info:', error);
        dataStream.writeData({
          type: 'error',
          content: 'No se pudo cargar el análisis de activos. Inténtelo de nuevo más tarde.',
        });
      }
    },
  });
