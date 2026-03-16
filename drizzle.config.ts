import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env.local for local development (drizzle-kit CLI needs DATABASE_URL)
dotenv.config({ path: '.env.local' });

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: {
    // Use DIRECT_URL (session pooler, port 5432) for migrations/push if available,
    // otherwise fall back to DATABASE_URL (transaction pooler, port 6543).
    // Transaction pooler is slow for introspection; session pooler supports it properly.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
});
