/**
 * @fileoverview AI Component Types
 *
 * Shared type definitions for AI tool components.
 *
 * @module apps/admin/components/ai/types
 */

import type { Wrench01Icon } from '@hugeicons/core-free-icons';

/**
 * Tool definition for the Magi AI Tools page.
 */
export interface MagiTool {
  /** Unique identifier for the tool */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Hugeicons icon component */
  icon: typeof Wrench01Icon;
  /** Tool category */
  category: 'image' | 'video' | 'audio' | 'chat';
  /** AI provider (e.g., fal_ai, google, openai) */
  provider: string;
  /** Model identifier */
  model: string;
}
