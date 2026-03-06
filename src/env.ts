import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  HEARTMULA_URL: z.string().url(),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Missing or invalid environment variables:\n${errors}\n\nSee .env.local.example for required variables.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** @deprecated Use getEnv() for lazy validation. Kept for compatibility. */
export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
