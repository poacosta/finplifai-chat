import {
  Document,
  VectorStoreIndex,
  OpenAIEmbedding,
  SentenceSplitter,
  Settings,
  MetadataMode
} from 'llamaindex';
import { extractTextFromFile } from '@/lib/text-extraction';

// In-memory storage of document indices and metadata
const documentIndices = new Map<string, VectorStoreIndex>();
const documentMetadata = new Map<string, { fileName: string, fileType: string, fileId: string }>();

/**
 * Process a file and create searchable index
 */
export async function processFile(
  documentId: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  fileId: string
) {
  try {
    // Extract text content from file
    const text = await extractTextFromFile(fileBuffer, fileType);

    if (!text) {
      return { success: false, error: 'Could not extract text from file' };
    }

    // Create document object with metadata
    const document = new Document({
      text,
      metadata: {
        documentId,
        fileName,
        fileType
      }
    });

    // Create embeddings model
    const embedModel = new OpenAIEmbedding({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    // Set node parser in global settings
    Settings.nodeParser = new SentenceSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });

    // Set embedding model
    Settings.embedModel = embedModel;

    // Create index
    const index = await VectorStoreIndex.fromDocuments([document]);

    // Store index and metadata for later retrieval
    documentIndices.set(documentId, index);
    documentMetadata.set(documentId, { fileName, fileType, fileId });

    return { success: true, documentId };
  } catch (error) {
    console.error('Error processing file:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Query a document index
 */
export async function queryDocument(documentId: string, query: string, topK = 3) {
  try {
    const index = documentIndices.get(documentId);

    if (!index) {
      return { success: false, error: 'Document index not found' };
    }

    // Create retriever
    const retriever = index.asRetriever({
      similarityTopK: topK
    });

    // Create query engine
    const queryEngine = index.asQueryEngine({
      retriever
    });

    // Execute query
    const response = await queryEngine.query({
      query: query
    });

    // Get metadata for the document
    const metadata = documentMetadata.get(documentId);

    // Extract source node information safely
    const sourceNodes = [];

    if (response.sourceNodes && Array.isArray(response.sourceNodes)) {
      for (const node of response.sourceNodes) {
        sourceNodes.push({
          text: node.node.getContent(MetadataMode.NONE),
          score: typeof node.score === 'number' ? node.score : 0,
          metadata: node.node.metadata || {}
        });
      }
    }

    return {
      success: true,
      result: response.message.content,
      sourceNodes,
      metadata
    };
  } catch (error) {
    console.error('Error querying document:', error);
    return { success: false, error: String(error) };
  }
}