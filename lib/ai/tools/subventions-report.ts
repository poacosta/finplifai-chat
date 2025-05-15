import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';

interface SubventionsReportInfoProps {
  dataStream: DataStreamWriter;
}

export const createSubventionsReport = ({ dataStream }: SubventionsReportInfoProps) =>
  tool({
    description: 'Crea un listado de subvenciones según la consulta requerida por el usuario',
    parameters: z.object({
      fileUrl: z.string().describe('URL del archivo que contiene la información para generar el listado de subvenciones'),
    }),
    execute: async ({ fileUrl }) => {
      try {
        if (!fileUrl) {
          console.log('No file attached to this message');
        }

        const url = `${process.env.SUBVENTIONS_REPORT_AGENT_API_URL}`;

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
        console.error('Error fetching subventions report info:', error);
        dataStream.writeData({
          type: 'error',
          content: 'No se pudo cargar el listado de subvenciones. Inténtelo de nuevo más tarde.',
        });
      }
    },
  });
