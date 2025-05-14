import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { generateUUID } from '@/lib/utils';
import { attachFileToThread, createThreadForChat, uploadFile } from "@/lib/ai/assistants";
import { getChatById } from "@/lib/db/queries";

// Define supported file types
const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const SUPPORTED_FOR_FILE_SEARCH = [
  'application/pdf',
  'text/plain',
  'text/csv',
];

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'El tamaño del archivo no puede superar los 5MB',
    })
    .refine((file) => SUPPORTED_FILE_TYPES.includes(file.type), {
      message: 'Las extensiones permitidas son JPEG, PNG, PDF, TXT, XLS, XLSX or CSV',
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
      return NextResponse.json({ error: 'No se ha podido subir el archivo' }, { status: 400 });
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

    try {
      const chatId = formData.get('chatId') as string;

      if (!chatId) return NextResponse.json({ error: 'Se requiere el identificador del chat antes de continuar' }, { status: 400 });

      const chat = await getChatById({ id: chatId });

      if (!chat) return NextResponse.json({ error: 'El chat debe estar iniciado antes de subir archivos' }, { status: 400 });

      const threadId = (chat && !chat.threadId) ? await createThreadForChat(chatId) : chat.threadId;

      if (!threadId) return NextResponse.json({ error: 'El chat debe conectado al LLM antes de subir archivos' }, { status: 400 });

      // Upload to Vercel Blob as you currently do
      const data = await put(`${filename}`, fileBuffer, { access: 'public' });

      // Check if the file type is supported for file search
      const isFileSearchSupported = SUPPORTED_FOR_FILE_SEARCH.includes(file.type);

      if (isFileSearchSupported) {
        // Upload to OpenAI for Assistants API
        const fileObj = new File([fileBuffer], filename, { type: file.type });
        const openaiFileId = await uploadFile(fileObj);

        await attachFileToThread(threadId, openaiFileId);

        return NextResponse.json({
          ...data,
          fileType: file.type,
          contentType: file.type,
          pathname: filename,
          documentId: generateUUID(),
          openaiFileId: openaiFileId,
        });
      }

      return NextResponse.json({
        ...data,
        fileType: file.type,
        contentType: file.type,
        pathname: filename,
        documentId: generateUUID(),
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
