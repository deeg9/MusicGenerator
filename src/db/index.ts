import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Transaction mode pooler requires prepare: false
// (Supabase Transaction pooler does not support prepared statements)
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle({ client, schema });
