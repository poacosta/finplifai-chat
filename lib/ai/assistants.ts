// eslint-disable-next-line import/no-named-as-default
import OpenAI from 'openai';
import { updateChatThreadId } from "@/lib/db/queries";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'assistant-1234567890';

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
  try {
    const messageParams: any = {
      role: 'user',
      content: content
    };

    if (fileIds.length > 0) {
      messageParams.file_ids = fileIds;
    }

    return await openai.beta.threads.messages.create(threadId, messageParams);
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw error;
  }
}

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

export async function searchFilesWithAssistant(threadId: string, query: string): Promise<string> {
  await addMessageToThread(
    threadId,
    `INSTRUCTION: Find information relevant to: ${query}\nReturn only facts from the uploaded documents.`
  );

  const run = await openai.beta.threads.runs.createAndPoll(threadId, {
    assistant_id: process.env.OPENAI_ASSISTANT_ID || ASSISTANT_ID,
    tools: [{ type: "file_search" }],
    instructions: "Search documents for relevant information."
  });

  const messages = await openai.beta.threads.messages.list(threadId, {
    run_id: run.id,
  });

  const message = messages.data.pop()!;

  if (!message) {
    return "No se encontraron resultados.";
  }

  if (message.content[0].type === "text") {
    const { text } = message.content[0];

    return text.value.trim();
  }

  return "No se encontraron resultados.";
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

export async function attachFileToThread(threadId: string, fileId: string) {
  try {
    const messageParams = {
      role: 'user',
      content: "Documento adjunto para análisis."
    } as any;

    messageParams.file_ids = [fileId];

    await openai.beta.threads.messages.create(threadId, messageParams);
    return true;
  } catch (error) {
    console.error('Error attaching file to thread:', error);
    return false;
  }
}
