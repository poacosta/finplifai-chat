import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { generateUUID } from '@/lib/utils';
import { uploadFile } from "@/lib/ai/assistants";
import { processFile } from '@/lib/document-query/service';
import { saveUploadedDocument } from '@/lib/db/queries';

// Define supported file types
const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf', // PDF files
  'text/plain', // TXT files
  'text/csv', // CSV files
];

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine((file) => SUPPORTED_FILE_TYPES.includes(file.type), {
      message: 'File type should be JPEG, PNG, PDF, TXT, or CSV',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();
    const documentId = generateUUID();

    try {
      // 1. Store file in Vercel Blob
      const blobData = await put(`${filename}`, fileBuffer, { access: 'public' });

      // 2. Upload to OpenAI for Assistants API
      const fileObj = new File([fileBuffer], filename, { type: file.type });
      const openaiFileId = await uploadFile(fileObj);

      // 3. Process and index the document
      const indexResult = await processFile(
        documentId,
        fileBuffer,
        filename,
        file.type,
        openaiFileId
      );

      // 4. Save document metadata to database
      if (indexResult.success) {
        await saveUploadedDocument({
          id: documentId,
          userId: session.user.id,
          fileName: filename,
          fileType: file.type,
          blobUrl: blobData.url,
          openaiFileId,
          createdAt: new Date(),
        });
      }

      return NextResponse.json({
        ...blobData,
        fileType: file.type,
        contentType: file.type,
        pathname: filename,
        documentId,
        openaiFileId,
        indexed: indexResult.success,
      });
    } catch (error) {
      console.error('Error during file upload:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to process request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
