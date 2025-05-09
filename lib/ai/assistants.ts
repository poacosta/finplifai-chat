// eslint-disable-next-line import/no-named-as-default
import OpenAI from 'openai';
import { generateUUID } from "@/lib/utils";
import { DataStreamWriter } from "ai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'assistant-1';

export async function createThread() {
  return openai.beta.threads.create();
}

export async function getThread(threadId: string) {
  try {
    return await openai.beta.threads.retrieve(threadId);
  } catch (error) {
    console.error('Error retrieving thread:', error);
    return null;
  }
}

export async function deleteThread(threadId: string) {
  try {
    await openai.beta.threads.del(threadId);
    return true;
  } catch (error) {
    console.error('Error deleting thread:', error);
    return false;
  }
}

export async function addMessageToThread(threadId: string, content: string, fileIds: string[] = []) {
  let messageContent: any;

  if (fileIds.length > 0) {
    messageContent = [
      { type: "text", text: content },
      ...fileIds.map(fileId => ({
        type: "file_attachment",
        file_id: fileId
      }))
    ];
  } else {
    messageContent = content; // Simple text content
  }

  return openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: messageContent,
  });
}

export async function uploadFile(file: File) {
  const uploadedFile = await openai.files.create({
    file,
    purpose: 'assistants',
  });
  return uploadedFile.id;
}

export async function runAssistant(threadId: string) {
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: ASSISTANT_ID,
  });

  let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

  while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 50));

    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
  }

  if (runStatus.status === 'failed') {
    throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
  }

  const messages = await openai.beta.threads.messages.list(threadId, {
    order: 'desc',
    limit: 1,
  });

  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

  if (!assistantMessage) {
    throw new Error('No assistant message found');
  }

  return assistantMessage;
}

export async function runAssistantWithStreaming(
  threadId: string,
  dataStream: DataStreamWriter
) {
  const assistantId = generateUUID();
  dataStream.writeData({ type: 'id', content: assistantId });

  const assistantMessage = await runAssistant(threadId);

  let contentParts: any[] = [];

  for (const content of assistantMessage.content) {
    if (content.type === 'text') {
      const text = content.text.value;
      contentParts.push({ type: 'text', text });

      const words = text.split(' ');

      for (let i = 0; i < words.length; i++) {
        dataStream.writeData({
          type: 'text-delta',
          content: words[i] + (i < words.length - 1 ? ' ' : ''),
        });
      }
    } else if (content.type === 'image_file') {
      const imageUrl = `/api/assistant-file?file_id=${content.image_file.file_id}`;

      contentParts.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });

      dataStream.writeData({
        type: 'image-delta',
        content: imageUrl,
      });
    }
  }

  dataStream.writeData({ type: 'finish', content: '' });

  return {
    id: assistantId,
    role: 'assistant',
    parts: contentParts,
    createdAt: new Date(),
  };
}
