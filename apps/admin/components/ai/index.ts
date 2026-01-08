/**
 * @fileoverview AI Components Index
 *
 * Re-exports all AI tool components.
 *
 * @module apps/admin/components/ai
 */

// Types
export type { MagiTool } from './types';

// Magi Page Components
export { MagiClient, MagiClientSkeleton } from './magi-client';
export { ToolsGrid } from './tools-grid';
export { ToolView } from './tool-view';

// Shared Components
export { ImageSourcePicker, type SelectedImage } from './image-source-picker';
export { PromptEditor, type PromptPreset } from './prompt-editor';
export { ResultActions } from './result-actions';

// Tools
export { BackgroundRemover } from './background-remover';
export { ImageGenerator } from './image-generator';
export { ImageUpscaler } from './image-upscaler';
export { ImageRerenderer } from './image-rerenderer';
