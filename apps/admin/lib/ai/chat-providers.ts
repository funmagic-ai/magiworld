/**
 * @fileoverview Chat Provider Configuration
 *
 * Configures AI SDK providers for the chatbot.
 * Supports OpenAI and Google Generative AI models.
 *
 * @module apps/admin/lib/ai/chat-providers
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// ============================================
// Types
// ============================================

export type ChatProviderType = 'openai' | 'google';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: ChatProviderType;
  modelId: string;
}

// ============================================
// Available Models
// ============================================

export const CHAT_MODELS: ChatModel[] = [
  // OpenAI Models
  {
    id: 'openai-gpt4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast & affordable',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
  },
  {
    id: 'openai-gpt4o',
    name: 'GPT-4o',
    description: 'Most capable',
    provider: 'openai',
    modelId: 'gpt-4o',
  },
  {
    id: 'openai-gpt4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Fast GPT-4',
    provider: 'openai',
    modelId: 'gpt-4-turbo',
  },
  // Google Models
  {
    id: 'google-gemini-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Fast & smart',
    provider: 'google',
    modelId: 'gemini-2.0-flash',
  },
  {
    id: 'google-gemini-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Advanced reasoning',
    provider: 'google',
    modelId: 'gemini-1.5-pro',
  },
];

// ============================================
// Provider Instances (lazy initialization)
// ============================================

const providers = {
  openai: () =>
    createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  google: () =>
    createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    }),
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get the AI model instance for a given model ID
 */
export function getChatModel(modelId: string) {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const provider = providers[model.provider]();
  return provider(model.modelId);
}

/**
 * Get the default model configuration
 */
export function getDefaultModel(): ChatModel {
  return CHAT_MODELS[0]; // GPT-4o Mini
}

/**
 * Get models grouped by provider
 */
export function getModelsByProvider(): Record<ChatProviderType, ChatModel[]> {
  return {
    openai: CHAT_MODELS.filter((m) => m.provider === 'openai'),
    google: CHAT_MODELS.filter((m) => m.provider === 'google'),
  };
}

/**
 * Get provider display name
 */
export function getProviderName(provider: ChatProviderType): string {
  const names: Record<ChatProviderType, string> = {
    openai: 'OpenAI',
    google: 'Google',
  };
  return names[provider];
}
