import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'processing',
  'success',
  'failed',
]);

export const outputTypeEnum = pgEnum('output_type', [
  'image',
  'model_3d',
  'fabrication',
]);

// Tasks table
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),

  // User reference (will be external ID from Logto later)
  userId: text('user_id').notNull(),

  // Tool reference (slug from Payload CMS)
  toolSlug: text('tool_slug').notNull(),

  // Input preservation (for "Re-create" workflow)
  inputParams: jsonb('input_params').$type<Record<string, unknown>>(),

  // Output data (polymorphic)
  outputType: outputTypeEnum('output_type'),
  outputData: jsonb('output_data').$type<{
    previewUrl?: string;
    downloadUrl?: string;
    width?: number;
    height?: number;
    glbUrl?: string;
    pointCloudDensity?: number;
    [key: string]: unknown;
  }>(),

  // Status tracking
  status: taskStatusEnum('status').notNull().default('pending'),

  // Error handling
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
