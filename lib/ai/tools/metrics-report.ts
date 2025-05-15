import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';

interface MetricsReportInfoProps {
  dataStream: DataStreamWriter;
}

export const createMetricsReport = ({ dataStream }: MetricsReportInfoProps) =>
  tool({
    description: 'Crea un reporte con las métricas de la empresa basado en un archivo',
    parameters: z.object({
      fileUrl: z.string().describe('URL del archivo que contiene la información para generar el reporte de métricas'),
      employee_number: z.string().describe('Número de empleados en la empresa'),
    }),
    execute: async ({ fileUrl, employee_number }) => {
      try {
        if (!fileUrl) {
          console.log('No file attached to this message');
        }

        const url = `${process.env.METRICS_REPORT_AGENT_API_URL}`;
        const token = `Bearer ${process.env.METRICS_REPORT_AGENT_API_KEY || ''}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
          },
          body: JSON.stringify({ url: fileUrl, employees: parseInt(employee_number) }),
        });

        if (!response.ok) {
          console.error('API request failed with status', response.status);
        }

        const data = await response.json();
        return data['metrics'];
      } catch (error) {
        console.error('Error fetching metrics report info:', error);
        dataStream.writeData({
          type: 'error',
          content: 'No se pudo cargar el reporte de métricas. Inténtelo de nuevo más tarde.',
        });
      }
    },
  });
