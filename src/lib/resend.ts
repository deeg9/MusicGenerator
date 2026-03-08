import { Resend } from 'resend';

// Note: process.env.RESEND_API_KEY used directly (not via getEnv()) because
// the Resend client is instantiated at module scope and lazy env validation
// may not have fired yet. Matches the pattern used for Supabase clients.
// Fallback to placeholder prevents constructor throw during next build page data
// collection when RESEND_API_KEY is not set in the environment. API calls will
// fail at runtime with 401 if the real key is absent — set RESEND_API_KEY in .env.local.
export const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder_build_only');
