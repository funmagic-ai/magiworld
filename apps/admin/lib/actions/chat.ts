'use server';

/**
 * @fileoverview Chat Server Actions
 *
 * Server actions for managing chat conversations and messages.
 * Provides CRUD operations for the chatbot feature.
 *
 * @module apps/admin/lib/actions/chat
 */

import {
  db,
  chatConversations,
  chatMessages,
  eq,
  desc,
} from '@magiworld/db';
import { revalidatePath } from 'next/cache';

// ============================================
// Types
// ============================================

export type Conversation = {
  id: string;
  title: string | null;
  provider: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
};

export type ConversationWithMessages = Conversation & {
  messages: Message[];
};

// ============================================
// Conversation Actions
// ============================================

/**
 * Create a new conversation
 */
export async function createConversation(
  provider: string = 'openai',
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const [conv] = await db
    .insert(chatConversations)
    .values({ provider, model })
    .returning();
  return conv.id;
}

/**
 * Get a conversation with its messages
 */
export async function getConversation(
  id: string
): Promise<ConversationWithMessages | null> {
  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .limit(1);

  if (!conv) return null;

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(chatMessages.createdAt);

  return { ...conv, messages };
}

/**
 * List recent conversations
 */
export async function listConversations(limit = 20): Promise<Conversation[]> {
  return db
    .select()
    .from(chatConversations)
    .orderBy(desc(chatConversations.updatedAt))
    .limit(limit);
}

/**
 * Save a message to a conversation
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<Message> {
  const [message] = await db
    .insert(chatMessages)
    .values({ conversationId, role, content })
    .returning();

  // Update conversation's updatedAt
  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  return message;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<void> {
  await db
    .update(chatConversations)
    .set({ title: title.trim(), updatedAt: new Date() })
    .where(eq(chatConversations.id, id));
}

/**
 * Update conversation model
 */
export async function updateConversationModel(
  id: string,
  provider: string,
  model: string
): Promise<void> {
  await db
    .update(chatConversations)
    .set({ provider, model, updatedAt: new Date() })
    .where(eq(chatConversations.id, id));
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(id: string): Promise<void> {
  await db.delete(chatConversations).where(eq(chatConversations.id, id));
  revalidatePath('/magi');
}

/**
 * Get messages for AI SDK format
 * Returns messages in the format expected by useChat hook
 */
export async function getMessagesForChat(
  conversationId: string
): Promise<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }[]> {
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt);

  return messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));
}

/**
 * Conversation with preview for list display
 */
export type ConversationPreview = Conversation & {
  preview: string | null;
  messageCount: number;
};

/**
 * List conversations with preview (first user message)
 */
export async function listConversationsWithPreview(
  limit = 50
): Promise<ConversationPreview[]> {
  const conversations = await db
    .select()
    .from(chatConversations)
    .orderBy(desc(chatConversations.updatedAt))
    .limit(limit);

  const result: ConversationPreview[] = [];

  for (const conv of conversations) {
    // Get first user message as preview
    const [firstMessage] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conv.id))
      .orderBy(chatMessages.createdAt)
      .limit(1);

    // Count messages
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conv.id));

    result.push({
      ...conv,
      preview: firstMessage?.content?.slice(0, 100) || null,
      messageCount: messages.length,
    });
  }

  return result;
}
