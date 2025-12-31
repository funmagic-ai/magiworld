/**
 * @fileoverview Shared TypeScript Type Definitions
 *
 * This module provides shared type definitions used across the Magiworld platform.
 * These types represent the application-level data structures that may differ
 * from the raw database types (e.g., with joined/transformed data).
 *
 * @module @magiworld/types
 */

// ============================================
// Tool Type Definitions
// ============================================

/**
 * Tool type information with localized content.
 * Represents a classification of AI tools (e.g., stylize, edit, 3d_gen).
 *
 * @example
 * ```typescript
 * const toolType: ToolTypeInfo = {
 *   id: 'uuid-here',
 *   slug: 'stylize',
 *   name: 'Stylize',  // Localized
 *   description: 'Transform images into artistic styles',
 *   badgeColor: 'default',
 *   componentKey: 'StylizeInterface',
 *   order: 1,
 *   isActive: true
 * };
 * ```
 */
export interface ToolTypeInfo {
  /** Unique identifier */
  id: string;
  /** URL-friendly slug (e.g., 'stylize', 'edit') */
  slug: string;
  /** Localized display name */
  name: string;
  /** Localized description (optional) */
  description?: string;
  /** Icon identifier (optional) */
  icon?: string;
  /** Badge color for UI display */
  badgeColor: 'default' | 'secondary' | 'outline';
  /** React component key for dynamic loading */
  componentKey: string;
  /** Display order (lower = first) */
  order: number;
  /** Whether the tool type is active */
  isActive: boolean;
}

/**
 * Tool type slug type alias.
 * Kept as string for flexibility with database-defined types.
 */
export type ToolTypeSlug = string;

// ============================================
// Category Definitions
// ============================================

/**
 * Category with localized content.
 * Used for organizing and filtering tools.
 *
 * @example
 * ```typescript
 * const category: Category = {
 *   id: 'uuid-here',
 *   name: 'Creative',  // Localized
 *   slug: 'creative',
 *   icon: 'palette',
 *   order: 1
 * };
 * ```
 */
export interface Category {
  /** Unique identifier */
  id: string;
  /** Localized category name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Icon identifier (emoji or icon library key) */
  icon?: string;
  /** Display order (lower = first) */
  order: number;
}

// ============================================
// Tool Definitions
// ============================================

/**
 * Full tool definition with related data.
 * Includes tool type, category, and all configuration.
 *
 * @example
 * ```typescript
 * const tool: Tool = {
 *   id: 'uuid-here',
 *   title: 'Anime Style',  // Localized
 *   slug: 'anime-style',
 *   description: 'Transform photos into anime style',
 *   toolType: { ... },
 *   category: { ... },
 *   isActive: true,
 *   isFeatured: true
 * };
 * ```
 */
export interface Tool {
  /** Unique identifier */
  id: string;
  /** Localized tool title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Localized description (optional) */
  description?: string;
  /** Associated category */
  category: Category;
  /** Thumbnail image (optional) */
  thumbnail?: Media;
  /** Tool type with full details */
  toolType: ToolTypeInfo;
  /** Localized prompt template (optional) */
  promptTemplate?: string;
  /** Tool-specific configuration */
  configJson?: Record<string, unknown>;
  /** AI processing endpoint */
  aiEndpoint?: string;
  /** Whether the tool is active */
  isActive: boolean;
  /** Whether the tool is featured on homepage */
  isFeatured: boolean;
  /** Display order within category */
  order: number;
  /** Creation timestamp (ISO string) */
  createdAt: string;
  /** Last update timestamp (ISO string) */
  updatedAt: string;
}

/**
 * Simplified tool data for list views.
 * Contains only essential fields for rendering tool cards.
 *
 * @example
 * ```typescript
 * const toolListItem: ToolListItem = {
 *   id: 'uuid-here',
 *   title: 'Anime Style',
 *   slug: 'anime-style',
 *   toolType: { slug: 'stylize', name: 'Stylize', badgeColor: 'default' },
 *   updatedAt: '2024-01-01T00:00:00Z'
 * };
 * ```
 */
export interface ToolListItem {
  /** Unique identifier */
  id: string;
  /** Localized tool title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Thumbnail image (optional) */
  thumbnail?: Media;
  /** Simplified tool type info for badges */
  toolType: {
    slug: string;
    name: string;
    badgeColor: 'default' | 'secondary' | 'outline';
  };
  /** Last update timestamp (ISO string) */
  updatedAt: string;
}

// ============================================
// Task Definitions
// ============================================

/**
 * Task processing status values.
 * - pending: Queued for processing
 * - processing: Currently being processed
 * - success: Completed successfully
 * - failed: Encountered an error
 */
export type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';

/**
 * AI output type categories.
 * - image: 2D image output
 * - model_3d: 3D model output
 * - fabrication: Physical fabrication parameters
 */
export type OutputType = 'image' | 'model_3d' | 'fabrication';

/**
 * Task output data structure.
 * Contains URLs and metadata for generated content.
 *
 * @example
 * ```typescript
 * // Image output
 * const imageOutput: TaskOutputData = {
 *   previewUrl: 'https://cdn.example.com/preview.jpg',
 *   downloadUrl: 'https://cdn.example.com/full.jpg',
 *   width: 1024,
 *   height: 1024
 * };
 *
 * // 3D model output
 * const modelOutput: TaskOutputData = {
 *   glbUrl: 'https://cdn.example.com/model.glb',
 *   pointCloudDensity: 50000
 * };
 * ```
 */
export interface TaskOutputData {
  /** URL for preview/thumbnail image */
  previewUrl?: string;
  /** URL for full-resolution download */
  downloadUrl?: string;
  /** Output image width */
  width?: number;
  /** Output image height */
  height?: number;
  /** URL for 3D model file */
  glbUrl?: string;
  /** Point cloud density for 3D models */
  pointCloudDensity?: number;
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * User-generated AI processing task.
 * Represents a single generation request and its results.
 *
 * @example
 * ```typescript
 * const task: Task = {
 *   id: 'uuid-here',
 *   userId: 'logto-user-123',
 *   toolSlug: 'anime-style',
 *   inputParams: { prompt: 'anime style', seed: 42 },
 *   outputType: 'image',
 *   outputData: { previewUrl: '...', downloadUrl: '...' },
 *   status: 'success',
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * };
 * ```
 */
export interface Task {
  /** Unique identifier */
  id: string;
  /** User ID from Logto authentication */
  userId: string;
  /** Slug of the tool used */
  toolSlug: string;
  /** Input parameters (prompt, seed, etc.) */
  inputParams?: Record<string, unknown>;
  /** Type of output generated */
  outputType?: OutputType;
  /** Generated output data */
  outputData?: TaskOutputData;
  /** Current processing status */
  status: TaskStatus;
  /** Error message if failed */
  errorMessage?: string;
  /** Task creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ============================================
// User Definitions
// ============================================

/**
 * User profile information.
 * Synced from Logto authentication service.
 */
export interface User {
  /** Unique identifier */
  id: string;
  /** User email address */
  email: string;
  /** External ID from Logto */
  externalId?: string;
  /** Account creation timestamp (ISO string) */
  createdAt: string;
  /** Last update timestamp (ISO string) */
  updatedAt: string;
}

// ============================================
// Media Definitions
// ============================================

/**
 * Media file metadata.
 * Represents uploaded images and other media.
 */
export interface Media {
  /** Unique identifier */
  id: string;
  /** Full URL to the media file */
  url: string;
  /** Alternative text for accessibility */
  alt?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

// ============================================
// Home Configuration Definitions
// ============================================

/**
 * Homepage banner configuration.
 * Used for promotional carousel and sidebar banners.
 */
export interface Banner {
  /** Banner image */
  image: Media;
  /** Localized banner title */
  title: string;
  /** Localized banner subtitle (optional) */
  subtitle?: string;
  /** Linked tool for click-through (optional) */
  link?: Tool;
}

/**
 * Homepage configuration.
 * Controls the promotional content on the landing page.
 *
 * @example
 * ```typescript
 * const homeConfig: HomeConfig = {
 *   mainBanners: [...],  // Up to 3 carousel banners
 *   sideBanners: [...]   // Exactly 2 sidebar banners
 * };
 * ```
 */
export interface HomeConfig {
  /** Main carousel banners (max 3) */
  mainBanners: Banner[];
  /** Sidebar banners (exactly 2) */
  sideBanners: Banner[];
}
