import { appendResponseMessages, createDataStreamResponse, smoothStream, streamText, } from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import { deleteChatById, getChatById, saveChat, saveMessages } from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage, getTrailingMessageId, } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { getLegalExpertInfo } from '@/lib/ai/tools/get-legal-expert-info';
import { getRandomPic } from "@/lib/ai/tools/get-random-pic";
import { createThreadForChat, searchFilesWithAssistant } from "@/lib/ai/assistants";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    } = await request.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    let chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      // Create a new thread for this chat
      let threadId = null;
      try {
        threadId = await createThreadForChat(id);
      } catch (error) {
        console.error('Failed to create thread for chat:', error);
      }

      await saveChat({
        id,
        userId: session.user.id,
        title,
        threadId,
      });

      chat = await getChatById({ id });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    let documentContext = '';
    if (chat?.threadId) {
      try {
        documentContext = await searchFilesWithAssistant(
          chat.threadId,
          userMessage.content
        );
      } catch (error) {
        console.error('Error searching files:', error);
        documentContext = '';
      }
    }

    const enhancedSystemPrompt = documentContext
      ? `${systemPrompt()}\n\nCONTEXTO DE DOCUMENTOS:\n${documentContext}`
      : systemPrompt();

    const messagesWithoutAttachments = messages.map((msg: any) => ({
      ...msg,
      experimental_attachments: undefined
    }));

    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: enhancedSystemPrompt,
            messages: messagesWithoutAttachments,
            maxSteps: 5,
            experimental_activeTools:
              selectedChatModel === 'chat-model-reasoning'
                ? []
                : [
                  'getRandomPic',
                  'getLegalExpertInfo',
                  'createDocument',
                  'updateDocument',
                ],
            experimental_transform: smoothStream({ chunking: 'word' }),
            experimental_generateMessageId: generateUUID,
            tools: {
              getRandomPic,
              getLegalExpertInfo: getLegalExpertInfo({ dataStream }),
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
            },
            onFinish: async ({ response }) => {
              if (session.user?.id) {
                try {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message) => message.role === 'assistant',
                    ),
                  });

                  if (!assistantId) {
                    console.error('No assistant message found!');
                    return
                  }

                  const [, assistantMessage] = appendResponseMessages({
                    messages: [userMessage],
                    responseMessages: response.messages,
                  });

                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: assistantMessage.parts,
                        attachments:
                          assistantMessage.experimental_attachments ?? [],
                        createdAt: new Date(),
                      },
                    ],
                  });
                } catch (_) {
                  console.error('Failed to save chat');
                }
              }
            },
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: 'stream-text',
            },
          });

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        } catch (error) {
          console.error('Error processing assistant response:', error);
          dataStream.writeData({
            type: 'error',
            content: 'An error occurred while processing your request!',
          });
        }
      },
      onError: (error) => {
        console.error('Error in data stream:', error);
        return 'Oops, an error occurred!';
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat eliminado', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
