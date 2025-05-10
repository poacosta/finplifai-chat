import { VectorStoreIndex, Document, serviceContextFromDefaults } from 'llamaindex';
import { StorageContext, SimpleDocumentStore, SimpleVectorStore } from 'llamaindex/storage';
import { OpenAIEmbedding } from 'llamaindex/embeddings/openai';
import { extractTextFromFile } from '@/lib/text-extraction';

// In-memory storage of document indices for the session
const documentIndices = new Map<string, VectorStoreIndex>();
const documentMetadata = new Map<string, { fileName: string, fileType: string, fileId: string }>();

/**
 * Creates a vector index from document text content
 */
export async function createDocumentIndex(
  documentId: string,
  text: string,
  metadata: { fileName: string; fileType: string; fileId: string }
) {
  try {
    // Create document with text content
    const document = new Document({ text, id: documentId, metadata });

    // Initialize embedding model
    const embedModel = new OpenAIEmbedding({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-ada-002',
    });

    // Setup storage context
    const storageContext = await StorageContext.fromDefaults({
      vectorStore: new SimpleVectorStore(),
      documentStore: new SimpleDocumentStore(),
    });

    // Create service context with embedding model
    const serviceContext = serviceContextFromDefaults({
      embedModel,
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Create vector index from document
    const index = await VectorStoreIndex.fromDocuments([document], {
      storageContext,
      serviceContext,
    });

    // Store index and metadata for later retrieval
    documentIndices.set(documentId, index);
    documentMetadata.set(documentId, metadata);

    return { success: true, documentId };
  } catch (error) {
    console.error('Error creating document index:', error);
    return { success: false, error: String(error) };
  }
}

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

    // Create index from text content
    return createDocumentIndex(documentId, text, { fileName, fileType, fileId });
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

    // Create query engine
    const queryEngine = index.asQueryEngine();

    // Execute query
    const response = await queryEngine.query({
      query,
    });

    // Get metadata for the document
    const metadata = documentMetadata.get(documentId);

    return {
      success: true,
      result: response.toString(),
      sourceNodes: response.sourceNodes,
      metadata
    };
  } catch (error) {
    console.error('Error querying document:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get all indexed documents
 */
export function getIndexedDocuments() {
  return Array.from(documentMetadata.entries()).map(([id, metadata]) => ({
    id,
    ...metadata
  }));
}

/**
 * Check if a document is indexed
 */
export function isDocumentIndexed(documentId: string) {
  return documentIndices.has(documentId);
}

/**
 * Delete a document index
 */
export function deleteDocumentIndex(documentId: string) {
  const wasDeleted = documentIndices.delete(documentId);
  documentMetadata.delete(documentId);
  return { success: wasDeleted };
}