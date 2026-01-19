/**
 * Database Cleanup Script
 *
 * Cleans up tasks and dead_letter_tasks tables.
 * Run with: pnpm --filter @magiworld/db db:cleanup-tasks
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tasks, deadLetterTasks, taskUsageLogs } from '../src/schema';
import { count } from 'drizzle-orm';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const queryClient = postgres(connectionString);
  const db = drizzle(queryClient);

  try {
    // Count records before deletion
    const [tasksCount] = await db.select({ count: count() }).from(tasks);
    const [dlqCount] = await db.select({ count: count() }).from(deadLetterTasks);

    console.log(`\nCurrent record counts:`);
    console.log(`  - tasks: ${tasksCount.count}`);
    console.log(`  - dead_letter_tasks: ${dlqCount.count}`);

    if (tasksCount.count === 0 && dlqCount.count === 0) {
      console.log('\nNo records to clean. Tables are already empty.');
      await queryClient.end();
      return;
    }

    console.log('\nCleaning tables...');

    // Delete in correct order due to foreign key constraints
    // 1. First delete task_usage_logs (references tasks)
    const deletedUsage = await db.delete(taskUsageLogs).returning({ id: taskUsageLogs.id });
    console.log(`  - Deleted ${deletedUsage.length} task_usage_logs records`);

    // 2. Delete dead_letter_tasks (references tasks)
    const deletedDlq = await db.delete(deadLetterTasks).returning({ id: deadLetterTasks.id });
    console.log(`  - Deleted ${deletedDlq.length} dead_letter_tasks records`);

    // 3. Finally delete tasks
    const deletedTasks = await db.delete(tasks).returning({ id: tasks.id });
    console.log(`  - Deleted ${deletedTasks.length} tasks records`);

    console.log('\nCleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

main();
