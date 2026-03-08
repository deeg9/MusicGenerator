import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  pgPolicy,
  index,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, anonRole } from 'drizzle-orm/supabase';
import { sql } from 'drizzle-orm';

export const songStatusEnum = pgEnum('song_status', [
  'generating',
  'completed',
  'failed',
]);

export const songs = pgTable(
  'songs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Auth linkage — one of these is non-null
    userId: uuid('user_id'),             // Supabase auth.users id; null for anonymous
    sessionToken: text('session_token'), // anonymous session cookie; null after claim

    // Status tracking
    status: songStatusEnum('status').notNull().default('generating'),
    heartbulaJobId: text('heartbula_job_id').notNull(),

    // Quiz fields (top-level for dashboard display/filtering)
    recipientName: text('recipient_name').notNull(),
    relationship: text('relationship').notNull(),
    genre: text('genre').notNull(),

    // Remaining quiz context
    quizData: jsonb('quiz_data').notNull().$type<{
      occasion?: string;
      qualities?: string;
      memories?: string;
      message?: string;
      voiceGender?: string;
      language?: string;
    }>(),

    // R2 audio storage
    r2WavKey: text('r2_wav_key'),   // null until finalized
    r2Mp3Key: text('r2_mp3_key'),   // null until finalized

    // Timing
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
  },
  (t) => [
    // ── RLS: Authenticated users see only their own songs ──────────────────
    pgPolicy('songs-authenticated-select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
    pgPolicy('songs-authenticated-update', {
      for: 'update',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
      withCheck: sql`user_id = auth.uid()`,
    }),
    pgPolicy('songs-authenticated-delete', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
    // ── RLS: anon role cannot read or write songs (all INSERT/UPDATE done
    //    by trusted server code via postgres role, which bypasses RLS) ──────
    pgPolicy('songs-anon-deny-all', {
      for: 'all',
      to: anonRole,
      using: sql`false`,
    }),
    // ── Indexes ─────────────────────────────────────────────────────────────
    index('songs_user_id_idx').on(t.userId),
    index('songs_session_token_idx').on(t.sessionToken),
    index('songs_status_idx').on(t.status),
  ],
).enableRLS();

// ── Subscription enums ──────────────────────────────────────────────────────

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'starter',
  'pro',
  'unlimited',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'inactive',
]);

// ── Subscriptions table ─────────────────────────────────────────────────────

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripePriceId: text('stripe_price_id'),
    tier: subscriptionTierEnum('tier').notNull(),
    status: subscriptionStatusEnum('status').notNull().default('inactive'),
    songsRemaining: integer('songs_remaining').notNull().default(0),
    songsPerMonth: integer('songs_per_month').notNull().default(0),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // RLS: Authenticated users can only SELECT their own subscription
    pgPolicy('subscriptions-authenticated-select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
    // Deny anon access entirely
    pgPolicy('subscriptions-anon-deny-all', {
      for: 'all',
      to: anonRole,
      using: sql`false`,
    }),
    // Indexes
    index('subscriptions_user_id_idx').on(t.userId),
    index('subscriptions_stripe_customer_id_idx').on(t.stripeCustomerId),
  ],
).enableRLS();
