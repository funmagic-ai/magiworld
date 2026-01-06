/**
 * @fileoverview Chat API Route Handler
 *
 * Handles streaming chat completions using AI SDK.
 * Supports OpenAI and Google providers with real-time streaming.
 *
 * @module apps/admin/app/api/chat/route
 */

import { streamText, convertToModelMessages } from 'ai';
import { getChatModel } from '@/lib/ai/chat-providers';
import { saveMessage } from '@/lib/actions/chat';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, modelId = 'openai-gpt4o-mini', conversationId } = await req.json();

    // Get the AI model based on modelId
    const model = getChatModel(modelId);

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Stream the response
    const result = streamText({
      model,
      system: 'You are a helpful assistant. Be concise and clear in your responses.',
      messages: modelMessages,
      onFinish: async ({ text }) => {
        // Save assistant message to database if conversationId is provided
        if (conversationId && text) {
          await saveMessage(conversationId, 'assistant', text);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[Chat API Error]', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
