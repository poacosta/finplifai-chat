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
    // 1. Add message to thread with clear instruction
    await addMessageToThread(
      threadId,
      `INSTRUCTION: Search for information relevant to the following query: ${query}\nPlease only return facts from the uploaded documents.`
    );

    // 2. Create a run with explicit configuration
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID || ASSISTANT_ID,
      tools: [{ type: "file_search" }],
      instructions: "Search documents for relevant information. Return only factual content found in documents."
    });

    // 3. Improved polling mechanism with better timeout
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    const startTime = Date.now();
    const maxTimeoutMs = 30000; // Longer timeout for larger documents

    console.log(`Assistant run started with ID: ${run.id}`);

    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      if (Date.now() - startTime > maxTimeoutMs) {
        console.warn(`Run timed out after ${maxTimeoutMs}ms`);
        await openai.beta.threads.runs.cancel(threadId, run.id);
        break;
      }

      // Exponential backoff for polling
      const delay = Math.min(500 * Math.pow(1.5, Math.floor((Date.now() - startTime) / 1000)), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      console.log(`Run status: ${runStatus}`);
    }

    // 4. Better response handling with validation
    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 1,
      });

      if (messages.data.length === 0) {
        console.warn('No messages returned from assistant');
        return "";
      }

      const message = messages.data[0];

      // Extract ONLY the text content, discarding all metadata and structure
      if (message.role === 'assistant' && message.content && message.content.length > 0) {
        console.log('Successfully retrieved assistant response');

        // Extract only plain text from all text content parts
        return message.content
          .filter(item => item.type === 'text')
          .map(item => item.text?.value || '')
          .join('\n');  // Return string instead of the complex object
      } else {
        console.warn('Invalid message format from assistant');
        return "";
      }
    } else {
      console.warn(`Assistant run failed or timed out: ${runStatus.status}`);
      return "";
    }
  } catch (error) {
    // 6. Improved error logging
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
