import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const generationStatusEnum = pgEnum('generation_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const generations = pgTable(
  'generations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runpodJobId: text('runpod_job_id').notNull(),
    status: generationStatusEnum('status').notNull().default('pending'),

    // Inputs
    promptText: text('prompt_text').notNull(),
    lyrics: text('lyrics'),
    genreTags: text('genre_tags'),
    duration: integer('duration').notNull().default(120), // seconds
    instrumental: boolean('instrumental').notNull().default(false),

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),

    // Error tracking
    errorType: text('error_type'), // 'model_error' | 'timeout' | 'gpu_unavailable' | etc.
    errorMessage: text('error_message'),
    retryable: boolean('retryable'),
  },
  (table) => [
    index('generations_status_idx').on(table.status),
    index('generations_runpod_job_idx').on(table.runpodJobId),
  ],
);

export const outputs = pgTable(
  'outputs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    variantIndex: integer('variant_index').notNull(), // 0 or 1
    r2Key: text('r2_key').notNull(), // e.g. "generations/abc123/output_0.wav"
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('outputs_generation_idx').on(table.generationId)],
);

export const generationsRelations = relations(generations, ({ many }) => ({
  outputs: many(outputs),
}));

export const outputsRelations = relations(outputs, ({ one }) => ({
  generation: one(generations, {
    fields: [outputs.generationId],
    references: [generations.id],
  }),
}));
