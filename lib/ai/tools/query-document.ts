import { z } from 'zod';
import { DataStreamWriter, tool } from 'ai';
import { queryDocument, getIndexedDocuments, isDocumentIndexed } from '@/lib/document-query/service';
import { getUploadedDocumentById } from '@/lib/db/queries';

interface QueryDocumentProps {
  dataStream: DataStreamWriter;
}

export const queryDocumentTool = ({ dataStream }: QueryDocumentProps) =>
  tool({
    description: 'Query information from an uploaded document using natural language',
    parameters: z.object({
      documentId: z.string().describe('The ID of the document to query'),
      query: z.string().describe('The natural language query to run against the document'),
    }),
    execute: async ({ documentId, query }) => {
      try {
        // Check if document exists
        const dbDocument = await getUploadedDocumentById({ id: documentId });

        if (!dbDocument) {
          dataStream.writeData({
            type: 'text-delta',
            content: 'No se encontró el documento solicitado.'
          });
          return {
            success: false,
            error: 'Documento no encontrado'
          };
        }

        // Check if document is indexed
        if (!isDocumentIndexed(documentId)) {
          dataStream.writeData({
            type: 'text-delta',
            content: `El documento "${dbDocument.fileName}" no está indexado para búsquedas. Por favor, vuelva a subirlo.`
          });
          return {
            success: false,
            error: 'Documento no indexado'
          };
        }

        // Query document
        const result = await queryDocument(documentId, query);

        if (!result.success) {
          dataStream.writeData({
            type: 'text-delta',
            content: `Error al consultar el documento: ${result.error}`
          });
          return {
            success: false,
            error: result.error
          };
        }

        // Return results
        dataStream.writeData({
          type: 'text-delta',
          content: `Consultando "${dbDocument.fileName}" con la pregunta: "${query}"\n\n${result.result}`
        });

        return {
          success: true,
          result: result.result,
          documentName: dbDocument.fileName,
          sourceNodes: result.sourceNodes,
        };
      } catch (error) {
        console.error('Error querying document:', error);

        dataStream.writeData({
          type: 'text-delta',
          content: `Error al consultar el documento: ${error}`
        });

        return {
          success: false,
          error: String(error)
        };
      }
    },
  });

export const listDocumentsTool = ({ dataStream }: QueryDocumentProps) =>
  tool({
    description: 'List all uploaded and indexed documents available for querying',
    parameters: z.object({}),
    execute: async ({}) => {
      try {
        // Get all indexed documents
        const documents = getIndexedDocuments();

        if (documents.length === 0) {
          dataStream.writeData({
            type: 'text-delta',
            content: 'No hay documentos indexados disponibles para consulta.'
          });

          return {
            success: true,
            documents: []
          };
        }

        // Format the document list
        const documentList = documents.map(doc => ({
          id: doc.id,
          fileName: doc.fileName,
          fileType: doc.fileType
        }));

        // Stream result to the user
        dataStream.writeData({
          type: 'text-delta',
          content: 'Documentos disponibles para consulta:\n\n' +
            documentList.map(doc => `- ${doc.fileName} (ID: ${doc.id})`).join('\n')
        });

        return {
          success: true,
          documents: documentList
        };
      } catch (error) {
        console.error('Error listing documents:', error);

        dataStream.writeData({
          type: 'text-delta',
          content: `Error al listar documentos: ${error}`
        });

        return {
          success: false,
          error: String(error)
        };
      }
    },
  });