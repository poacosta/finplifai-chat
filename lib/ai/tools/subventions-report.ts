import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';

interface SubventionsReportInfoProps {
  dataStream: DataStreamWriter;
}

export const createSubventionsReport = ({ dataStream }: SubventionsReportInfoProps) =>
  tool({
    description: 'Crea un listado de subvenciones según la consulta requerida por el usuario',
    parameters: z.object({
      query: z.string().describe('Palabra clave para buscar en el listado de subvenciones'),
    }),
    execute: async ({ query }) => {
      try {
        const url = `${process.env.SUBVENTIONS_REPORT_AGENT_API_URL}`;

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
