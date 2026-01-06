'use client';

/**
 * @fileoverview Chat Component
 *
 * Main chat interface using AI SDK's useChat hook.
 * Supports multiple AI providers with streaming responses.
 * Includes conversation history sidebar.
 *
 * @module apps/admin/components/chat/chat
 */

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChatHeader } from './chat-header';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ConversationList } from './conversation-list';
import { CHAT_MODELS, getDefaultModel } from '@/lib/ai/chat-providers';
import {
  createConversation,
  saveMessage,
  updateConversationModel,
  updateConversationTitle,
  getConversation,
} from '@/lib/actions/chat';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface ChatProps {
  className?: string;
}

export function Chat({ className }: ChatProps) {
  const [modelId, setModelId] = useState(getDefaultModel().id);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use refs to always have current values in transport
  const modelIdRef = useRef(modelId);
  const conversationIdRef = useRef(conversationId);

  // Keep refs in sync with state
  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Create transport once with dynamic body via prepareSendMessagesRequest
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            modelId: modelIdRef.current,
            conversationId: conversationIdRef.current,
          },
        }),
      }),
    [] // Only create once, refs handle dynamic values
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle model change
  const handleModelChange = useCallback(
    async (newModelId: string | null) => {
      if (!newModelId) return;
      setModelId(newModelId);
      const newModel = CHAT_MODELS.find((m) => m.id === newModelId);
      if (conversationId && newModel) {
        await updateConversationModel(
          conversationId,
          newModel.provider,
          newModel.modelId
        );
      }
    },
    [conversationId]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // Handle submit with conversation creation
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput) return;

      // Create conversation if it doesn't exist
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const currentModel = CHAT_MODELS.find((m) => m.id === modelId);
        currentConversationId = await createConversation(
          currentModel?.provider || 'openai',
          currentModel?.modelId || 'gpt-4o-mini'
        );
        setConversationId(currentConversationId);

        // Auto-generate title from first message (first 50 chars)
        const title = trimmedInput.slice(0, 50) + (trimmedInput.length > 50 ? '...' : '');
        await updateConversationTitle(currentConversationId, title);
      }

      // Save user message to database
      await saveMessage(currentConversationId, 'user', trimmedInput);

      // Clear input and send message
      setInput('');
      sendMessage({ text: trimmedInput });
    },
    [conversationId, input, modelId, sendMessage]
  );

  // Load a conversation
  const handleLoadConversation = useCallback(
    async (id: string) => {
      if (id === conversationId) return;

      setIsLoadingConversation(true);
      try {
        const conv = await getConversation(id);
        if (conv) {
          // Convert messages to UI format
          const uiMessages: UIMessage[] = conv.messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: m.content }],
          }));

          setMessages(uiMessages);
          setConversationId(id);

          // Set model from conversation
          const model = CHAT_MODELS.find(
            (m) => m.provider === conv.provider && m.modelId === conv.model
          );
          if (model) {
            setModelId(model.id);
          }
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [conversationId, setMessages]
  );

  // Start new chat
  const handleNewChat = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setInput('');
    setModelId(getDefaultModel().id);
  }, [setMessages]);

  // Extract text content from message parts
  const getMessageContent = useCallback(
    (message: (typeof messages)[0]): string => {
      if (!message.parts) return '';
      return message.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('');
    },
    []
  );

  const currentModel = CHAT_MODELS.find((m) => m.id === modelId);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  // Escape key to exit maximize
  useEffect(() => {
    if (!isMaximized) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMaximized(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMaximized]);

  // Sidebar component
  const sidebar = (
    <div
      className={cn(
        'border-r bg-muted/30 flex-shrink-0 transition-all duration-200',
        showSidebar ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      <ConversationList
        selectedId={conversationId}
        onSelect={handleLoadConversation}
        onNewChat={handleNewChat}
      />
    </div>
  );

  // Chat main area
  const chatMain = (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Fixed header */}
      <div className="flex-shrink-0">
        <div className="flex items-center border-b bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="m-1"
            title={showSidebar ? 'Hide history' : 'Show history'}
          >
            <HugeiconsIcon
              icon={showSidebar ? Cancel01Icon : Menu01Icon}
              className="h-4 w-4"
              strokeWidth={2}
            />
          </Button>
          <div className="flex-1">
            <ChatHeader
              model={currentModel}
              onModelChange={handleModelChange}
              onStop={isLoading ? stop : undefined}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
          </div>
        </div>
      </div>

      {/* Scrollable messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {isLoadingConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">
                Select a model and type a message to begin
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  role: message.role,
                  content: getMessageContent(message),
                }}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <ChatMessage loading />
            )}
            {error && (
              <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                Error: {error.message}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed input */}
      <div className="flex-shrink-0">
        <ChatInput
          input={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isLoading || isLoadingConversation}
        />
      </div>
    </div>
  );

  // Maximized: full screen overlay
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex">
        {sidebar}
        {chatMain}
      </div>
    );
  }

  // Normal: inline with container
  return (
    <div
      className={cn(
        'flex flex-1 min-h-0 border rounded-lg overflow-hidden bg-background',
        className
      )}
    >
      {sidebar}
      {chatMain}
    </div>
  );
}
