import { db } from './src/index.js';
import { tools, toolTypes } from './src/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
  console.log('Checking tools in database...\n');

  // Get all tools
  const allTools = await db
    .select({
      id: tools.id,
      slug: tools.slug,
      name: tools.name,
      isActive: tools.isActive,
    })
    .from(tools);

  console.log('All tools in database:');
  if (allTools.length === 0) {
    console.log('  (no tools found)');
  } else {
    allTools.forEach(t => {
      console.log(`  - ${t.slug} (${t.name}) - active: ${t.isActive}`);
    });
  }

  // Check specifically for background-remove
  const bgRemove = allTools.find(t => t.slug === 'background-remove');
  if (bgRemove) {
    console.log('\n✓ background-remove tool found:', bgRemove.id);
  } else {
    console.log('\n✗ background-remove tool NOT FOUND in database!');
    console.log('  You need to create this tool via the admin interface.');
  }

  // Get all tool types
  const allTypes = await db.select({ id: toolTypes.id, name: toolTypes.name }).from(toolTypes);
  console.log('\nTool types in database:');
  if (allTypes.length === 0) {
    console.log('  (no tool types found)');
  } else {
    allTypes.forEach(t => {
      console.log(`  - ${t.name} (${t.id})`);
    });
  }

  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
