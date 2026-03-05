import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

try {
  console.log('Adding mp3_r2_key and mp3_file_size_bytes columns to outputs table...');

  // Add mp3_r2_key column (nullable)
  await sql`
    ALTER TABLE outputs
    ADD COLUMN IF NOT EXISTS mp3_r2_key text;
  `;
  console.log('  mp3_r2_key column added (or already exists)');

  // Add mp3_file_size_bytes column (nullable)
  await sql`
    ALTER TABLE outputs
    ADD COLUMN IF NOT EXISTS mp3_file_size_bytes integer;
  `;
  console.log('  mp3_file_size_bytes column added (or already exists)');

  // Verify columns exist
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'outputs'
    ORDER BY ordinal_position;
  `;
  console.log('\nCurrent outputs table columns:');
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

  console.log('\nMigration complete!');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
