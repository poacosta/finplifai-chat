import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';

interface Model347InfoProps {
  dataStream: DataStreamWriter;
}

export const createModel347 = ({ dataStream }: Model347InfoProps) =>
  tool({
    description: 'Crea o genera el modelo 347 basado en un archivo',
    parameters: z.object({
      fileUrl: z.string().describe('URL del archivo que contiene la información para generar el modelo 347'),
    }),
    execute: async ({ fileUrl }) => {
      try {
        if (!fileUrl) {
          console.log('No file attached to this message');
        }

        const url = `${process.env.MODEL_347_AGENT_API_URL}`;

        const analysisResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: fileUrl }),
        });

        if (!analysisResponse.ok) {
          console.error('API request failed with status', analysisResponse.status);
        }

        const data = await analysisResponse.json();
        const result = data['markdown_content'];

        return `__MARKDOWN_OUTPUT__\n${result}`;
      } catch (error) {
        console.error('Error fetching model 347 info:', error);
        dataStream.writeData({
          type: 'error',
          content: 'No se pudo generar el modelo 347. Inténtelo de nuevo más tarde.',
        });
      }
    },
  });
