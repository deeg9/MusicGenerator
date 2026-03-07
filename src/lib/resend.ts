import { Resend } from 'resend';

// Note: process.env.RESEND_API_KEY used directly (not via getEnv()) because
// the Resend client is instantiated at module scope and lazy env validation
// may not have fired yet. Matches the pattern used for Supabase clients.
export const resend = new Resend(process.env.RESEND_API_KEY);
