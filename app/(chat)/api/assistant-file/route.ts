import OpenAI from 'openai';
import { auth } from '@/app/(auth)/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get('file_id');

  if (!fileId) {
    return new Response('Missing file_id parameter', { status: 400 });
  }

  try {
    const response = await openai.files.content(fileId);
    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': blob.type,
        'Content-Length': blob.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    return new Response('Error retrieving file', { status: 500 });
  }
}
