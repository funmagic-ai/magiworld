/**
 * @fileoverview Database Client Configuration
 *
 * This module provides the Drizzle ORM database client instance for the Magiworld platform.
 * It establishes a connection to PostgreSQL using the postgres.js driver and exports
 * the configured database client along with all schema definitions.
 *
 * @module @magiworld/db
 *
 * @example
 * ```typescript
 * import { db, tools, eq } from '@magiworld/db';
 *
 * // Query all active tools
 * const activeTools = await db
 *   .select()
 *   .from(tools)
 *   .where(eq(tools.isActive, true));
 * ```
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Re-export all schema definitions for convenient imports
export * from './schema';

/**
 * Database connection string from environment variables.
 * Expected format: postgresql://user:password@host:port/database
 *
 * @see {@link https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING}
 */
const connectionString = process.env.DATABASE_URL!;

/**
 * PostgreSQL query client instance.
 * Uses postgres.js for efficient connection pooling and query execution.
 *
 * @see {@link https://github.com/porsager/postgres}
 */
const queryClient = postgres(connectionString);

/**
 * Drizzle ORM database client instance.
 * Pre-configured with the full schema for type-safe queries.
 *
 * @example
 * ```typescript
 * // Simple select query
 * const allTools = await db.select().from(tools);
 *
 * // Query with relations using schema
 * const toolsWithTypes = await db.query.tools.findMany({
 *   with: { toolType: true }
 * });
 * ```
 */
export const db = drizzle(queryClient, { schema });

/**
 * Type alias for the database client instance.
 * Useful for typing function parameters that accept the db client.
 *
 * @example
 * ```typescript
 * async function getToolCount(database: Database): Promise<number> {
 *   const result = await database.select().from(tools);
 *   return result.length;
 * }
 * ```
 */
export type Database = typeof db;
