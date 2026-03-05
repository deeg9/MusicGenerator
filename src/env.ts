import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  HEARTMULA_URL: z.string().url(),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Missing or invalid environment variables:\n${errors}\n\nSee .env.local.example for required variables.`,
  );
}

export const env = parsed.data;
