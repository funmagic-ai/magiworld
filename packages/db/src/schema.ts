/**
 * @fileoverview Database Schema Definitions
 *
 * This file defines all database tables for the Magiworld platform using Drizzle ORM.
 * The schema follows a translation table pattern for internationalization (i18n),
 * where each content table has a corresponding translation table for localized content.
 *
 * @module @magiworld/db/schema
 */

import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, uuid } from 'drizzle-orm/pg-core';

// ============================================
// Enums
// ============================================

/**
 * Badge color options for tool type display.
 * Used to visually distinguish different tool types in the UI.
 */
export const badgeColorEnum = pgEnum('badge_color', ['default', 'secondary', 'outline']);

/**
 * Status values for AI processing tasks.
 * - pending: Task is queued and waiting to be processed
 * - processing: Task is currently being executed by the AI
 * - success: Task completed successfully
 * - failed: Task encountered an error
 */
export const taskStatusEnum = pgEnum('task_status', ['pending', 'processing', 'success', 'failed']);

/**
 * Status values for AI providers.
 * - active: Provider is operational and accepting requests
 * - inactive: Provider is disabled (admin action)
 * - degraded: Provider is experiencing issues but still operational
 */
export const providerStatusEnum = pgEnum('provider_status', ['active', 'inactive', 'degraded']);

/**
 * Circuit breaker states for provider health.
 * - closed: Normal operation, requests flow through
 * - open: Provider failing, requests blocked
 * - half_open: Testing if provider recovered
 */
export const circuitStateEnum = pgEnum('circuit_state', ['closed', 'open', 'half_open']);

/**
 * Status values for dead letter queue tasks.
 * - pending: Failed task awaiting review
 * - retried: Task has been requeued for retry
 * - archived: Task has been archived (no further action)
 */
export const deadLetterStatusEnum = pgEnum('dead_letter_status', ['pending', 'retried', 'archived']);

/**
 * Supported locales for content translation.
 * - en: English (default)
 * - ja: Japanese
 * - pt: Portuguese (Brazil)
 * - zh: Chinese (Simplified)
 */
export const localeEnum = pgEnum('locale', ['en', 'ja', 'pt', 'zh']);

// ============================================
// Content Management Tables
// ============================================

/**
 * Tool Types Table
 *
 * Defines the classification of AI tools (e.g., stylize, edit, 3d_gen).
 * Used for grouping tools in the UI and URL routing.
 *
 * @example
 * { slug: 'edit', badgeColor: 'default' }
 */
export const toolTypes = pgTable('tool_types', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** URL-friendly unique identifier (e.g., 'stylize', 'edit') */
  slug: text('slug').notNull().unique(),
  /** Visual badge color for UI display */
  badgeColor: badgeColorEnum('badge_color').notNull().default('default'),
  /** Display order (lower numbers appear first) */
  order: integer('order').notNull().default(0),
  /** Whether this tool type is visible to users */
  isActive: boolean('is_active').notNull().default(true),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tool Type Translations Table
 *
 * Stores localized content for tool types.
 * Each tool type can have multiple translations (one per supported locale).
 */
export const toolTypeTranslations = pgTable('tool_type_translations', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to parent tool type (cascades on delete) */
  toolTypeId: uuid('tool_type_id').notNull().references(() => toolTypes.id, { onDelete: 'cascade' }),
  /** Locale code for this translation */
  locale: localeEnum('locale').notNull(),
  /** Localized display name */
  name: text('name').notNull(),
  /** Localized description text */
  description: text('description'),
});

/**
 * Tools Table
 *
 * Defines individual AI tools available on the platform.
 * Each tool belongs to a tool type and contains configuration
 * for the AI processing pipeline.
 *
 * @example
 * {
 *   slug: 'anime-style',
 *   toolTypeId: '<uuid>',
 *   aiEndpoint: '/api/ai/stylize'
 * }
 */
export const tools = pgTable('tools', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** URL-friendly unique identifier */
  slug: text('slug').notNull().unique(),
  /** Reference to tool type (determines UI component) */
  toolTypeId: uuid('tool_type_id').notNull().references(() => toolTypes.id),
  /**
   * Price configuration as JSON for flexible billing
   * @example { "type": "token", "input_per_1k": 0.005, "output_per_1k": 0.015 }
   * @example { "type": "request", "cost_per_call": 0.003 }
   * @example { "type": "image", "cost_per_image": 0.02 }
   */
  priceConfig: jsonb('price_config'),
  /** URL to tool thumbnail image */
  thumbnailUrl: text('thumbnail_url'),
  /**
   * Reference images for style guidance (e.g., for fig-me tool)
   * Stored as PostgreSQL text array to preserve order
   * @example ['https://cdn.example.com/style1.jpg', 'https://cdn.example.com/style2.jpg']
   */
  referenceImages: text('reference_images').array(),
  /**
   * Tool-specific configuration as JSON
   * Used to store tool parameters, UI options, and processing hints
   * @example { "maxFileSize": 10485760, "allowedFormats": ["jpg", "png"] }
   * @example { "defaultStyle": "anime", "qualityOptions": ["draft", "standard", "hd"] }
   */
  configJson: jsonb('config_json'),
  /** Whether this tool is visible to users */
  isActive: boolean('is_active').notNull().default(true),
  /** Whether this tool is featured on homepage */
  isFeatured: boolean('is_featured').notNull().default(false),
  /** Display order within category (lower numbers appear first) */
  order: integer('order').notNull().default(0),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  /** Soft delete timestamp (null = not deleted) */
  deletedAt: timestamp('deleted_at'),
});

/**
 * Tool Translations Table
 *
 * Stores localized content for tools including title and description.
 */
export const toolTranslations = pgTable('tool_translations', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to parent tool (cascades on delete) */
  toolId: uuid('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  /** Locale code for this translation */
  locale: localeEnum('locale').notNull(),
  /** Localized tool title */
  title: text('title').notNull(),
  /** Localized tool description */
  description: text('description'),
});

/**
 * Folders Table
 *
 * Hierarchical folder structure for organizing media assets.
 * Supports nested folders through self-referencing parentId.
 *
 * @example
 * { name: 'Banners', parentId: null }
 * { name: '2024 Campaigns', parentId: '<banners-folder-uuid>' }
 */
export const folders = pgTable('folders', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Folder display name */
  name: text('name').notNull(),
  /** Parent folder ID for nesting (null = root level) */
  parentId: uuid('parent_id'),
  /** Folder creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Folder last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Media Table
 *
 * Stores metadata for uploaded media files (images, videos, etc.).
 * Actual files are stored in external storage (S3).
 *
 * @example
 * {
 *   filename: 'banner-hero.jpg',
 *   url: 'https://cdn.funmagic.ai/media/banner-hero.jpg',
 *   mimeType: 'image/jpeg',
 *   width: 1920,
 *   height: 1080
 * }
 */
export const media = pgTable('media', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to parent folder (null = root level) */
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  /** Original filename */
  filename: text('filename').notNull(),
  /** Full URL to the media file */
  url: text('url').notNull(),
  /** Alternative text for accessibility */
  alt: text('alt'),
  /** MIME type (e.g., 'image/jpeg', 'image/png', 'video/mp4') */
  mimeType: text('mime_type'),
  /** Image/video width in pixels */
  width: integer('width'),
  /** Image/video height in pixels */
  height: integer('height'),
  /** File size in bytes */
  size: integer('size'),
  /** Upload timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Soft delete timestamp (null = not deleted) */
  deletedAt: timestamp('deleted_at'),
});

/**
 * Home Banners Table
 *
 * Defines promotional banners displayed on the homepage.
 * Banners can be of type 'main' (large carousel) or 'side' (smaller sidebars).
 *
 * @example
 * { type: 'main', imageUrl: 'https://cdn.../banner.jpg', link: '/studio/edit', order: 1 }
 */
export const homeBanners = pgTable('home_banners', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Banner type: 'main' for carousel, 'side' for sidebar banners */
  type: text('type').notNull(),
  /** Direct URL to banner image (CDN) */
  imageUrl: text('image_url'),
  /** Optional click-through link URL */
  link: text('link'),
  /** Display order (lower numbers appear first) */
  order: integer('order').notNull().default(0),
  /** Whether this banner is currently displayed */
  isActive: boolean('is_active').notNull().default(true),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  /** Soft delete timestamp (null = not deleted) */
  deletedAt: timestamp('deleted_at'),
});

/**
 * Home Banner Translations Table
 *
 * Stores localized text content for homepage banners.
 */
export const homeBannerTranslations = pgTable('home_banner_translations', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to parent banner (cascades on delete) */
  bannerId: uuid('banner_id').notNull().references(() => homeBanners.id, { onDelete: 'cascade' }),
  /** Locale code for this translation */
  locale: localeEnum('locale').notNull(),
  /** Localized banner title */
  title: text('title').notNull(),
  /** Localized banner subtitle/description */
  subtitle: text('subtitle'),
});

// ============================================
// OEM & Attribution Tables
// ============================================

/**
 * OEM Software Brands Table
 *
 * Stores configuration for OEM partner brands (white-labeled desktop software).
 * Each brand can have custom theming, branding, and tool type filtering.
 * Managed by admins via apps/admin.
 *
 * @example
 * {
 *   slug: 'partner-a',
 *   name: 'Partner A Studio',
 *   softwareId: 'PARTNER_A_2024',
 *   themeConfig: { primaryColor: '#FF5722', logo: 'https://...', brandName: 'Partner Studio' },
 *   allowedToolTypeIds: ['<uuid1>', '<uuid2>']
 * }
 */
export const oemSoftwareBrands = pgTable('oem_software_brands', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** URL-friendly unique identifier */
  slug: text('slug').notNull().unique(),
  /** Display name for internal use */
  name: text('name').notNull(),
  /** Unique identifier sent by desktop software for brand detection */
  softwareId: text('software_id').notNull().unique(),
  /** Brand theme configuration (primaryColor, logo, brandName) */
  themeConfig: jsonb('theme_config'),
  /** Array of tool type IDs this brand can access (empty = all) */
  allowedToolTypeIds: jsonb('allowed_tool_type_ids').$type<string[]>().default([]),
  /** Whether this brand is active */
  isActive: boolean('is_active').notNull().default(true),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// User Tables
// ============================================

/**
 * Users Table (Web App)
 *
 * Stores user profile information synced from Logto authentication.
 * Used for displaying user profiles and storing app-specific preferences.
 * Profile data is lazily synced on each login.
 *
 * @example
 * {
 *   logtoId: 'user_abc123',
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   colorMode: 'dark',
 *   registrationBrandId: '<brand-uuid>'
 * }
 */
export const users = pgTable('users', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Logto user ID (sub claim) - used for authentication lookup */
  logtoId: text('logto_id').notNull().unique(),
  /** User's email address from Logto */
  email: text('email'),
  /** Whether email has been verified in Logto */
  emailVerified: boolean('email_verified').default(false),
  /** User's display name from Logto */
  name: text('name'),
  /** URL to user's avatar image from Logto */
  avatarUrl: text('avatar_url'),
  /** User's preferred locale */
  locale: localeEnum('locale').default('en'),
  /** User's preferred color mode (light/dark/system) */
  colorMode: text('color_mode').default('system'),
  /** Brand user first registered from (null = direct web registration) */
  registrationBrandId: uuid('registration_brand_id').references(() => oemSoftwareBrands.id),
  /** Channel of first registration */
  registrationChannel: text('registration_channel').default('web'),
  /** Record creation timestamp (first login) */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  /** Last successful login timestamp */
  lastLoginAt: timestamp('last_login_at'),
});

/**
 * Admin Users Table (Admin App)
 *
 * Stores admin user profile information synced from Logto authentication.
 * Separate from web users for security isolation.
 * Role-based access control will be handled via Logto RBAC.
 *
 * @example
 * {
 *   logtoId: 'admin_xyz789',
 *   email: 'admin@magiworld.com',
 *   name: 'Admin User',
 *   isActive: true
 * }
 */
export const adminUsers = pgTable('admin_users', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Logto user ID (sub claim) - used for authentication lookup */
  logtoId: text('logto_id').notNull().unique(),
  /** Admin's email address from Logto (required for admins) */
  email: text('email').notNull(),
  /** Admin's display name from Logto */
  name: text('name'),
  /** URL to admin's avatar image from Logto */
  avatarUrl: text('avatar_url'),
  /** Whether this admin account is active (can be disabled without deletion) */
  isActive: boolean('is_active').default(true),
  /** Record creation timestamp (first login) */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  /** Last successful login timestamp */
  lastLoginAt: timestamp('last_login_at'),
});

/**
 * Admin Tasks Table
 *
 * Stores tasks created by admin users for internal Magi tools.
 * Unlike the `tasks` table for web users, this table:
 * - References adminUsers instead of users
 * - Uses toolSlug (string) instead of toolId (FK to tools table)
 * - Is for admin-only internal AI tools
 *
 * @example
 * {
 *   adminId: '<admin-uuid>',
 *   toolSlug: 'background-remove',
 *   inputParams: { imageUrl: 'https://...' },
 *   status: 'success',
 *   outputData: { resultUrl: 'https://...' }
 * }
 */
export const adminTasks = pgTable('admin_tasks', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to the admin user who created this task */
  adminId: uuid('admin_id').notNull().references(() => adminUsers.id),
  /** Tool slug identifier (e.g., 'background-remove', 'image-generate') */
  toolSlug: text('tool_slug').notNull(),
  /** Reference to the provider processing this task (optional) */
  providerId: uuid('provider_id').references(() => providers.id),
  /** Input parameters for AI processing (JSON) */
  inputParams: jsonb('input_params'),
  /** Output data including URLs and metadata (JSON) */
  outputData: jsonb('output_data'),
  /** Current processing status */
  status: taskStatusEnum('status').notNull().default('pending'),
  /** Error message if task failed */
  errorMessage: text('error_message'),
  /** Task priority (1-20, lower = higher priority) */
  priority: integer('priority').default(15),
  /** Processing progress percentage (0-100) */
  progress: integer('progress').default(0),
  /** BullMQ job ID for tracking */
  bullJobId: text('bull_job_id'),
  /** Idempotency key to prevent duplicate processing */
  idempotencyKey: text('idempotency_key').unique(),
  /** Request ID for tracing */
  requestId: text('request_id'),
  /** Number of processing attempts */
  attemptsMade: integer('attempts_made').default(0),
  /** When task processing started */
  startedAt: timestamp('started_at'),
  /** When task processing completed */
  completedAt: timestamp('completed_at'),
  /** Task creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Task last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// Provider Tables
// ============================================

/**
 * Providers Table
 *
 * Stores AI provider configurations for task processing.
 * Providers are external AI services (e.g., fal.ai, OpenAI, Google).
 * Each provider can have rate limits, timeouts, and encrypted API keys.
 *
 * @example
 * {
 *   slug: 'fal_ai',
 *   name: 'fal.ai',
 *   rateLimitMax: 100,
 *   rateLimitWindow: 60000,
 *   status: 'active'
 * }
 */
export const providers = pgTable('providers', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** URL-friendly unique identifier (e.g., 'fal_ai', 'openai', 'google') */
  slug: text('slug').notNull().unique(),
  /** Display name for the provider */
  name: text('name').notNull(),
  /**
   * Credential fields - use whichever your provider requires:
   * - apiKey: For simple API key auth (OpenAI, fal.ai, etc.)
   * - accessKeyId + secretAccessKey: For IAM-style auth (AWS, Tencent, etc.)
   */
  /** AES-256 encrypted API key (for simple API key providers) */
  apiKeyEncrypted: text('api_key_encrypted'),
  /** AES-256 encrypted Access Key ID (for IAM-style providers like AWS/Tencent) */
  accessKeyIdEncrypted: text('access_key_id_encrypted'),
  /** AES-256 encrypted Secret Access Key (for IAM-style providers) */
  secretAccessKeyEncrypted: text('secret_access_key_encrypted'),
  /** Cloud region (e.g., 'us-east-1', 'ap-guangzhou') */
  region: text('region'),
  /** Maximum requests per rate limit window */
  rateLimitMax: integer('rate_limit_max').default(100),
  /** Rate limit window in milliseconds */
  rateLimitWindow: integer('rate_limit_window').default(60000),
  /** Default request timeout in milliseconds */
  defaultTimeout: integer('default_timeout').default(120000),
  /** Provider operational status */
  status: providerStatusEnum('status').notNull().default('active'),
  /** Circuit breaker state */
  circuitState: circuitStateEnum('circuit_state').notNull().default('closed'),
  /** Timestamp when circuit was opened (for half-open transition) */
  circuitOpenedAt: timestamp('circuit_opened_at'),
  /** Number of consecutive failures (for circuit breaker) */
  failureCount: integer('failure_count').default(0),
  /** Provider-specific configuration as JSON */
  configJson: jsonb('config_json'),
  /** Whether this provider is enabled for use */
  isActive: boolean('is_active').notNull().default(true),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Admin Providers Table
 *
 * Stores AI provider configurations for admin/internal task processing.
 * Separate from web providers for cost isolation and billing separation.
 * Admin tasks use these credentials instead of the shared providers table.
 *
 * @example
 * {
 *   slug: 'fal_ai',
 *   name: 'fal.ai (Admin)',
 *   apiKeyEncrypted: '...',
 *   status: 'active'
 * }
 */
export const adminProviders = pgTable('admin_providers', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** URL-friendly unique identifier (e.g., 'fal_ai', 'openai', 'google') */
  slug: text('slug').notNull().unique(),
  /** Display name for the provider */
  name: text('name').notNull(),
  /**
   * Credential fields - use whichever your provider requires:
   * - apiKey: For simple API key auth (OpenAI, fal.ai, etc.)
   * - accessKeyId + secretAccessKey: For IAM-style auth (AWS, Tencent, etc.)
   */
  /** AES-256 encrypted API key (for simple API key providers) */
  apiKeyEncrypted: text('api_key_encrypted'),
  /** AES-256 encrypted Access Key ID (for IAM-style providers like AWS/Tencent) */
  accessKeyIdEncrypted: text('access_key_id_encrypted'),
  /** AES-256 encrypted Secret Access Key (for IAM-style providers) */
  secretAccessKeyEncrypted: text('secret_access_key_encrypted'),
  /** Cloud region (e.g., 'us-east-1', 'ap-guangzhou') */
  region: text('region'),
  /** Provider operational status */
  status: providerStatusEnum('status').notNull().default('active'),
  /** Provider-specific configuration as JSON */
  configJson: jsonb('config_json'),
  /** Whether this provider is enabled for use */
  isActive: boolean('is_active').notNull().default(true),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Record last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// User Task Tables
// ============================================

/**
 * Tasks Table
 *
 * Stores user-generated AI processing tasks.
 * This is a high-volume transactional table that tracks all AI generation requests.
 *
 * @example
 * {
 *   userId: '<user-uuid>',
 *   toolId: '<tool-uuid>',
 *   inputParams: { prompt: 'anime style', seed: 42 },
 *   status: 'success',
 *   outputData: { previewUrl: '...', downloadUrl: '...' }
 * }
 */
export const tasks = pgTable('tasks', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to the user who created this task */
  userId: uuid('user_id').notNull().references(() => users.id),
  /** Reference to the tool used for this task */
  toolId: uuid('tool_id').notNull().references(() => tools.id),
  /** Reference to the provider processing this task */
  providerId: uuid('provider_id').references(() => providers.id),
  /** Input parameters for AI processing (JSON) */
  inputParams: jsonb('input_params'),
  /** Output data including URLs and metadata (JSON) */
  outputData: jsonb('output_data'),
  /** Current processing status */
  status: taskStatusEnum('status').notNull().default('pending'),
  /** Error message if task failed */
  errorMessage: text('error_message'),
  /** Task priority (1-20, higher = more important) */
  priority: integer('priority').default(5),
  /** Processing progress percentage (0-100) */
  progress: integer('progress').default(0),
  /** BullMQ job ID for tracking */
  bullJobId: text('bull_job_id'),
  /** Idempotency key to prevent duplicate processing */
  idempotencyKey: text('idempotency_key').unique(),
  /** Request ID for tracing */
  requestId: text('request_id'),
  /** Number of processing attempts */
  attemptsMade: integer('attempts_made').default(0),
  /** When task processing started */
  startedAt: timestamp('started_at'),
  /** When task processing completed */
  completedAt: timestamp('completed_at'),
  /** Task creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Task last update timestamp */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  /**
   * Parent task ID for multi-step workflows
   * Links child tasks to their parent task (e.g., 3D generation task linked to transform task)
   * Null for root/standalone tasks
   */
  parentTaskId: uuid('parent_task_id'),
});

/**
 * Task Responses Table
 *
 * Records raw request/response data from AI providers for each task step.
 * Supports multi-step tools (e.g., fig-me with transform + 3d steps).
 * Used for debugging, auditing, and replay analysis.
 *
 * @example
 * {
 *   taskId: '<task-uuid>',
 *   stepName: 'transform',
 *   provider: 'openai',
 *   model: 'gpt-4o',
 *   rawRequest: { model: 'gpt-4o', input: [...], tools: [...] },
 *   rawResponse: { id: 'resp_xxx', output: [...], usage: {...} },
 *   latencyMs: 3500
 * }
 */
export const taskResponses = pgTable('task_responses', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to the parent task */
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  /** Step name for multi-step tools (e.g., 'transform', '3d') */
  stepName: text('step_name'),
  /** Provider slug (e.g., 'openai', 'fal_ai', '3d_tripo') */
  provider: text('provider'),
  /** Model name used (e.g., 'gpt-4o', 'gpt-image-1.5') */
  model: text('model'),
  /**
   * Raw request sent to the provider API
   * Stores the complete request payload for replay/debugging
   */
  rawRequest: jsonb('raw_request'),
  /**
   * Raw response from the provider API
   * Stores the complete response including usage data
   */
  rawResponse: jsonb('raw_response'),
  /** API call latency in milliseconds */
  latencyMs: integer('latency_ms'),
  /** HTTP status code from the API response */
  statusCode: integer('status_code'),
  /** Error message if the API call failed */
  errorMessage: text('error_message'),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Dead Letter Tasks Table
 *
 * Stores tasks that failed all retry attempts.
 * Used for manual review, debugging, and potential manual retry.
 *
 * @example
 * {
 *   originalTaskId: '<task-uuid>',
 *   queue: 'fal_ai',
 *   errorMessage: 'API rate limit exceeded',
 *   attemptsMade: 3,
 *   status: 'pending'
 * }
 */
export const deadLetterTasks = pgTable('dead_letter_tasks', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to the original failed task */
  originalTaskId: uuid('original_task_id').references(() => tasks.id),
  /** Queue name where the task failed */
  queue: text('queue').notNull(),
  /** Error message from the final failure */
  errorMessage: text('error_message').notNull(),
  /** Full error stack trace */
  errorStack: text('error_stack'),
  /** Number of attempts made before failure */
  attemptsMade: integer('attempts_made').notNull(),
  /** Original job payload (for replay) */
  payload: jsonb('payload'),
  /** DLQ entry status */
  status: deadLetterStatusEnum('status').notNull().default('pending'),
  /** Notes added by admin during review */
  reviewNotes: text('review_notes'),
  /** When the task was retried (if applicable) */
  retriedAt: timestamp('retried_at'),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Task Usage Logs Table
 *
 * Records API usage for each task, including model info and cost.
 * Stores snapshots of pricing config at call time for accurate billing.
 * This is a high-volume table for usage tracking and cost analysis.
 *
 * @example
 * {
 *   taskId: '<task-uuid>',
 *   userId: '<user-uuid>',
 *   providerId: '<provider-uuid>',
 *   modelName: 'gpt-4o',
 *   priceConfig: { type: 'token', input_per_1k: 0.005, output_per_1k: 0.015 },
 *   usageData: { prompt_tokens: 150, completion_tokens: 520 },
 *   costUsd: 0.0085
 * }
 */
export const taskUsageLogs = pgTable('task_usage_logs', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to the task */
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  /** Reference to the user who initiated the task */
  userId: uuid('user_id').notNull().references(() => users.id),
  /** Reference to the provider used */
  providerId: uuid('provider_id').notNull().references(() => providers.id),
  /** Reference to the tool used */
  toolId: uuid('tool_id').notNull().references(() => tools.id),
  /** AI model name (snapshot from tool at call time) */
  modelName: text('model_name').notNull(),
  /** AI model version (snapshot from tool at call time) */
  modelVersion: text('model_version'),
  /**
   * Price configuration (snapshot from tool at call time)
   * @example { "type": "token", "input_per_1k": 0.005, "output_per_1k": 0.015 }
   */
  priceConfig: jsonb('price_config').notNull(),
  /**
   * Raw usage data from API response (provider-specific)
   * @example { "prompt_tokens": 150, "completion_tokens": 520 }
   * @example { "seed": 12345, "inference_time_ms": 2300 }
   */
  usageData: jsonb('usage_data'),
  /** Calculated cost in USD */
  costUsd: text('cost_usd'),
  /** Request latency in milliseconds */
  latencyMs: integer('latency_ms'),
  /** Request status */
  status: text('status').notNull().default('success'),
  /** Error message if failed */
  errorMessage: text('error_message'),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// Attribution Tables
// ============================================

/**
 * User Attributions Table (First-Touch)
 *
 * Captures UTM parameters and referrer information at user registration.
 * One record per user - stores the first-touch attribution data.
 *
 * @example
 * {
 *   userId: '<user-uuid>',
 *   utmSource: 'google',
 *   utmMedium: 'cpc',
 *   utmCampaign: 'summer-2024'
 * }
 */
export const userAttributions = pgTable('user_attributions', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to user (one attribution per user) */
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  /** UTM source parameter (e.g., 'google', 'facebook') */
  utmSource: text('utm_source'),
  /** UTM medium parameter (e.g., 'cpc', 'email', 'social') */
  utmMedium: text('utm_medium'),
  /** UTM campaign parameter */
  utmCampaign: text('utm_campaign'),
  /** UTM term parameter (for paid search keywords) */
  utmTerm: text('utm_term'),
  /** UTM content parameter (for A/B testing) */
  utmContent: text('utm_content'),
  /** Full referrer URL */
  referrerUrl: text('referrer_url'),
  /** Landing page URL */
  landingPage: text('landing_page'),
  /** Record creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * User Logins Table
 *
 * Tracks each user login session with brand and channel information.
 * Used for analyzing which OEM software brands users access from.
 *
 * @example
 * {
 *   userId: '<user-uuid>',
 *   brandId: '<brand-uuid>',
 *   channel: 'desktop',
 *   ipAddress: '192.168.1.1'
 * }
 */
export const userLogins = pgTable('user_logins', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to user */
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** Brand user logged in from (null = direct web login) */
  brandId: uuid('brand_id').references(() => oemSoftwareBrands.id),
  /** Login channel */
  channel: text('channel').notNull().default('web'),
  /** Client IP address */
  ipAddress: text('ip_address'),
  /** Client user agent string */
  userAgent: text('user_agent'),
  /** Login timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Payment Attributions Table (Last-Touch)
 *
 * Captures attribution data at the time of payment.
 * Records the last-touch source for payment attribution analysis.
 *
 * @example
 * {
 *   userId: '<user-uuid>',
 *   paymentId: 'pi_abc123',
 *   brandId: '<brand-uuid>',
 *   channel: 'desktop',
 *   amount: 9900,
 *   currency: 'usd'
 * }
 */
export const paymentAttributions = pgTable('payment_attributions', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to user */
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** External payment reference (e.g., Stripe payment intent ID) */
  paymentId: text('payment_id').notNull(),
  /** Brand user paid from (null = direct web payment) */
  brandId: uuid('brand_id').references(() => oemSoftwareBrands.id),
  /** Payment channel */
  channel: text('channel').notNull().default('web'),
  /** Last-touch UTM source at payment time */
  utmSource: text('utm_source'),
  /** Last-touch UTM medium at payment time */
  utmMedium: text('utm_medium'),
  /** Last-touch UTM campaign at payment time */
  utmCampaign: text('utm_campaign'),
  /** Payment amount in cents */
  amount: integer('amount').notNull(),
  /** Payment currency code (e.g., 'usd', 'eur') */
  currency: text('currency').notNull().default('usd'),
  /** Payment timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// User Assets Tables
// ============================================

/**
 * User Assets Table
 *
 * Stores user-saved outputs from AI tools.
 * Users can save their generated results to their personal asset library.
 *
 * @example
 * {
 *   userId: '<user-uuid>',
 *   taskId: '<task-uuid>',
 *   toolId: '<tool-uuid>',
 *   name: 'My Background Removed Image',
 *   type: 'image',
 *   url: 'https://cdn.../result.png'
 * }
 */
export const userAssets = pgTable('user_assets', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Reference to user who owns this asset */
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** Reference to the task that generated this asset (optional) */
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  /** Reference to the tool used to create this asset */
  toolId: uuid('tool_id').references(() => tools.id),
  /** User-friendly name for the asset */
  name: text('name').notNull(),
  /** Asset type (image, video, 3d_model) */
  type: text('type').notNull(),
  /** URL to the asset file */
  url: text('url').notNull(),
  /** URL to thumbnail image (optional) */
  thumbnailUrl: text('thumbnail_url'),
  /** Additional metadata (width, height, format, etc.) */
  metadata: jsonb('metadata'),
  /** Asset creation timestamp */
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Soft delete timestamp (null = not deleted) */
  deletedAt: timestamp('deleted_at'),
});

// ============================================
// Type Exports
// ============================================

/** Inferred select type for tool_types table */
export type ToolType = typeof toolTypes.$inferSelect;
/** Inferred insert type for tool_types table */
export type ToolTypeInsert = typeof toolTypes.$inferInsert;

/** Inferred select type for tool_type_translations table */
export type ToolTypeTranslation = typeof toolTypeTranslations.$inferSelect;
/** Inferred insert type for tool_type_translations table */
export type ToolTypeTranslationInsert = typeof toolTypeTranslations.$inferInsert;

/** Inferred select type for tools table */
export type Tool = typeof tools.$inferSelect;
/** Inferred insert type for tools table */
export type ToolInsert = typeof tools.$inferInsert;

/** Inferred select type for tool_translations table */
export type ToolTranslation = typeof toolTranslations.$inferSelect;
/** Inferred insert type for tool_translations table */
export type ToolTranslationInsert = typeof toolTranslations.$inferInsert;

/** Inferred select type for media table */
export type Media = typeof media.$inferSelect;
/** Inferred insert type for media table */
export type MediaInsert = typeof media.$inferInsert;

/** Inferred select type for home_banners table */
export type HomeBanner = typeof homeBanners.$inferSelect;
/** Inferred insert type for home_banners table */
export type HomeBannerInsert = typeof homeBanners.$inferInsert;

/** Inferred select type for home_banner_translations table */
export type HomeBannerTranslation = typeof homeBannerTranslations.$inferSelect;
/** Inferred insert type for home_banner_translations table */
export type HomeBannerTranslationInsert = typeof homeBannerTranslations.$inferInsert;

/** Inferred select type for users table */
export type User = typeof users.$inferSelect;
/** Inferred insert type for users table */
export type UserInsert = typeof users.$inferInsert;

/** Inferred select type for admin_users table */
export type AdminUser = typeof adminUsers.$inferSelect;
/** Inferred insert type for admin_users table */
export type AdminUserInsert = typeof adminUsers.$inferInsert;

/** Inferred select type for tasks table */
export type Task = typeof tasks.$inferSelect;
/** Inferred insert type for tasks table */
export type TaskInsert = typeof tasks.$inferInsert;

/** Inferred select type for task_responses table */
export type TaskResponse = typeof taskResponses.$inferSelect;
/** Inferred insert type for task_responses table */
export type TaskResponseInsert = typeof taskResponses.$inferInsert;

/** Inferred select type for providers table */
export type Provider = typeof providers.$inferSelect;
/** Inferred insert type for providers table */
export type ProviderInsert = typeof providers.$inferInsert;

/** Inferred select type for admin_providers table */
export type AdminProvider = typeof adminProviders.$inferSelect;
/** Inferred insert type for admin_providers table */
export type AdminProviderInsert = typeof adminProviders.$inferInsert;

/** Inferred select type for dead_letter_tasks table */
export type DeadLetterTask = typeof deadLetterTasks.$inferSelect;
/** Inferred insert type for dead_letter_tasks table */
export type DeadLetterTaskInsert = typeof deadLetterTasks.$inferInsert;

/** Inferred select type for task_usage_logs table */
export type TaskUsageLog = typeof taskUsageLogs.$inferSelect;
/** Inferred insert type for task_usage_logs table */
export type TaskUsageLogInsert = typeof taskUsageLogs.$inferInsert;

/** Inferred select type for oem_software_brands table */
export type OemSoftwareBrand = typeof oemSoftwareBrands.$inferSelect;
/** Inferred insert type for oem_software_brands table */
export type OemSoftwareBrandInsert = typeof oemSoftwareBrands.$inferInsert;

/** Inferred select type for user_attributions table */
export type UserAttribution = typeof userAttributions.$inferSelect;
/** Inferred insert type for user_attributions table */
export type UserAttributionInsert = typeof userAttributions.$inferInsert;

/** Inferred select type for user_logins table */
export type UserLogin = typeof userLogins.$inferSelect;
/** Inferred insert type for user_logins table */
export type UserLoginInsert = typeof userLogins.$inferInsert;

/** Inferred select type for payment_attributions table */
export type PaymentAttribution = typeof paymentAttributions.$inferSelect;
/** Inferred insert type for payment_attributions table */
export type PaymentAttributionInsert = typeof paymentAttributions.$inferInsert;

/** Inferred select type for user_assets table */
export type UserAsset = typeof userAssets.$inferSelect;
/** Inferred insert type for user_assets table */
export type UserAssetInsert = typeof userAssets.$inferInsert;

