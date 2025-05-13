// eslint-disable-next-line import/no-named-as-default
import OpenAI from 'openai';
import { updateChatThreadId } from "@/lib/db/queries";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
});

// Use your specified assistant ID
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'assistant-1234567890';

// Delete thread
export async function deleteThread(threadId: string) {
  try {
    await openai.beta.threads.del(threadId);
    return true;
  } catch (error) {
    console.error('Error deleting thread:', error);
    return false;
  }
}

// Add message to thread
export async function addMessageToThread(threadId: string, content: string, fileIds: string[] = []) {
  try {
    const messageParams: any = {
      role: 'user',
      content: content
    };

    // Add file_ids if provided (using any to bypass TS limitations)
    if (fileIds.length > 0) {
      messageParams.file_ids = fileIds;
    }

    return await openai.beta.threads.messages.create(threadId, messageParams);
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw error;
  }
}

// Upload file to OpenAI (returns file ID)
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await openai.files.create({
      file,
      purpose: 'assistants',
    });
    return uploadedFile.id;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function searchFilesWithAssistant(threadId: string, query: string) {
  try {
    // Add the query as a message requesting document search
    await addMessageToThread(
      threadId,
      `Por favor, busca en los documentos subidos la información relacionada con: ${query}`
    );

    // Run the assistant with file_search tool enabled
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
      tools: [{ type: "file_search" }]
    });

    // Wait for completion with timeout
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    const startTime = Date.now();
    const timeoutMs = 15000;

    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      if (Date.now() - startTime > timeoutMs) break;
      await new Promise(resolve => setTimeout(resolve, 500));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (runStatus.status !== 'completed') {
      console.warn(`Assistant run ${runStatus.status}`);
      return null;
    }

    // Get response
    const messages = await openai.beta.threads.messages.list(threadId, {
      order: 'desc',
      limit: 1,
    });

    return messages.data[0];
  } catch (error) {
    console.error('Error searching files with assistant:', error);
    return null;
  }
}

export async function createThreadForChat(chatId: string) {
  try {
    const thread = await openai.beta.threads.create();
    if (thread) {
      await updateChatThreadId({ id: chatId, threadId: thread.id });
      return thread.id;
    }
    return null;
  } catch (error) {
    console.error('Error creating thread for chat:', error);
    return null;
  }
}

// Attach a file to a thread
export async function attachFileToThread(threadId: string, fileId: string) {
  try {
    // Use type assertion to bypass TypeScript limitation
    const messageParams = {
      role: 'user',
      content: "Documento adjunto para análisis."
    } as any;

    // Add file_ids property after type assertion
    messageParams.file_ids = [fileId];

    await openai.beta.threads.messages.create(threadId, messageParams);
    return true;
  } catch (error) {
    console.error('Error attaching file to thread:', error);
    return false;
  }
}
