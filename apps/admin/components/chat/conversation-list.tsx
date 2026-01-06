'use client';

/**
 * @fileoverview Conversation List Component
 *
 * Displays a list of past conversations grouped by date.
 * Allows users to select, delete, and create new conversations.
 *
 * @module apps/admin/components/chat/conversation-list
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Delete02Icon,
  MessageMultiple01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import {
  listConversationsWithPreview,
  deleteConversation,
  type ConversationPreview,
} from '@/lib/actions/chat';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  className?: string;
}

/**
 * Group conversations by date
 */
function groupByDate(conversations: ConversationPreview[]): {
  label: string;
  conversations: ConversationPreview[];
}[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: Record<string, ConversationPreview[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  for (const conv of conversations) {
    const convDate = new Date(conv.updatedAt);
    if (convDate >= today) {
      groups['Today'].push(conv);
    } else if (convDate >= yesterday) {
      groups['Yesterday'].push(conv);
    } else if (convDate >= lastWeek) {
      groups['This Week'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  }

  return Object.entries(groups)
    .filter(([, convs]) => convs.length > 0)
    .map(([label, conversations]) => ({ label, conversations }));
}

/**
 * Format relative time
 */
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export function ConversationList({
  selectedId,
  onSelect,
  onNewChat,
  className,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await listConversationsWithPreview();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh when selectedId changes (new conversation created)
  useEffect(() => {
    if (selectedId) {
      loadConversations();
    }
  }, [selectedId, loadConversations]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const groups = groupByDate(conversations);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with New Chat button */}
      <div className="flex-shrink-0 p-3 border-b">
        <Button onClick={onNewChat} className="w-full" variant="outline">
          <HugeiconsIcon icon={Add01Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
          New Chat
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <HugeiconsIcon
              icon={MessageMultiple01Icon}
              className="h-8 w-8 mx-auto mb-2 opacity-50"
              strokeWidth={1.5}
            />
            <p>No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2">
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground px-2 mb-1">
                  {group.label}
                </h3>
                <ul className="space-y-1">
                  {group.conversations.map((conv) => (
                    <li key={conv.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelect(conv.id);
                          }
                        }}
                        className={cn(
                          'w-full text-left px-2 py-2 rounded-md transition-colors group cursor-pointer',
                          'hover:bg-muted',
                          selectedId === conv.id && 'bg-muted'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {conv.title || conv.preview || 'New conversation'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.messageCount} messages · {formatTime(new Date(conv.updatedAt))}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDelete(conv.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                            title="Delete conversation"
                          >
                            <HugeiconsIcon
                              icon={Delete02Icon}
                              className="h-4 w-4"
                              strokeWidth={2}
                            />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
