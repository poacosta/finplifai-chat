import { auth } from '@/app/(auth)/auth';
import { NextResponse } from 'next/server';
import {
  getUploadedDocumentsByUserId,
  getUploadedDocumentById,
  deleteUploadedDocumentById
} from '@/lib/db/queries';
import {
  isDocumentIndexed,
  queryDocument,
  deleteDocumentIndex
} from '@/lib/document-query/service';

// GET /api/documents - Get all documents for the current user
export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const documents = await getUploadedDocumentsByUserId({ userId: session.user.id });

    // Add indexing status to each document
    const documentsWithStatus = documents.map(doc => ({
      ...doc,
      indexed: isDocumentIndexed(doc.id)
    }));

    return NextResponse.json(documentsWithStatus);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents/query - Query a specific document
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { documentId, query } = await request.json();

    if (!documentId || !query) {
      return NextResponse.json(
        { error: 'Document ID and query are required' },
        { status: 400 }
      );
    }

    // Verify document belongs to the user
    const document = await getUploadedDocumentById({ id: documentId });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if document is indexed
    if (!isDocumentIndexed(documentId)) {
      return NextResponse.json(
        { error: 'Document is not indexed', indexed: false },
        { status: 400 }
      );
    }

    // Query document
    const result = await queryDocument(documentId, query);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error querying document:', error);
    return NextResponse.json(
      { error: 'Failed to query document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents?id=xxx - Delete a document
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify document belongs to the user
    const document = await getUploadedDocumentById({ id: documentId });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete document from database
    await deleteUploadedDocumentById({ id: documentId });

    // Remove document index
    if (isDocumentIndexed(documentId)) {
      deleteDocumentIndex(documentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}