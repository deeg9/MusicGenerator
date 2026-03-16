/**
 * One-time script to create PostHog dashboards and insights via the API.
 *
 * Usage:
 *   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/setup-posthog-dashboards.ts
 *
 * Where to get your credentials:
 *   1. Personal API Key: PostHog -> Settings -> Personal API Keys -> Create Key
 *      (needs "project" scope with read+write on dashboards and insights)
 *   2. Project ID: PostHog -> Settings -> Project -> Project ID (numeric)
 *
 * This script creates 4 dashboards:
 *   1. Quiz Funnel Conversion
 *   2. Song Generation Health
 *   3. Song Engagement
 *   4. Acquisition
 */

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error(`
Missing required environment variables.

  POSTHOG_PERSONAL_API_KEY  — Your PostHog personal API key (starts with phx_)
  POSTHOG_PROJECT_ID        — Your PostHog project ID (numeric)

How to get them:
  1. Go to PostHog -> Settings -> Personal API Keys -> Create Key
     (grant "project" scope with read+write on dashboards and insights)
  2. Go to PostHog -> Settings -> Project -> copy the Project ID

Run:
  POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 npx tsx scripts/setup-posthog-dashboards.ts
`);
  process.exit(1);
}

// Use the PostHog API host (not the ingestion host)
const API_BASE = POSTHOG_HOST.replace('us.i.posthog.com', 'us.posthog.com');

async function apiRequest(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `${API_BASE}/api/projects/${PROJECT_ID}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status} for ${path}: ${text}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

async function createDashboard(name: string, description: string): Promise<number> {
  const result = await apiRequest('/dashboards/', { name, description });
  const id = result.id as number;
  console.log(`  Created dashboard: ${name} (ID: ${id})`);
  return id;
}

async function createInsight(
  name: string,
  dashboardId: number,
  query: Record<string, unknown>,
): Promise<void> {
  await apiRequest('/insights/', {
    name,
    dashboards: [dashboardId],
    query,
  });
  console.log(`    + Insight: ${name}`);
}

async function main() {
  console.log('Creating PostHog dashboards...\n');

  // ─── 1. Quiz Funnel Conversion ──────────────────────────────────────────────
  const funnelDashId = await createDashboard(
    'Quiz Funnel Conversion',
    'Track quiz funnel drop-off, completion rates, and step timing',
  );

  await createInsight('Quiz Funnel Steps', funnelDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      series: [
        { kind: 'EventsNode', event: 'quiz_started', name: 'Quiz Started' },
        { kind: 'EventsNode', event: 'quiz_step_completed', name: 'Step 1 (Relationship)', properties: [{ key: 'step_number', value: 1, operator: 'exact', type: 'event' }] },
        { kind: 'EventsNode', event: 'quiz_step_completed', name: 'Step 2 (Genre/Voice)', properties: [{ key: 'step_number', value: 2, operator: 'exact', type: 'event' }] },
        { kind: 'EventsNode', event: 'quiz_step_completed', name: 'Step 3 (Qualities)', properties: [{ key: 'step_number', value: 3, operator: 'exact', type: 'event' }] },
        { kind: 'EventsNode', event: 'quiz_step_completed', name: 'Step 4 (Memories)', properties: [{ key: 'step_number', value: 4, operator: 'exact', type: 'event' }] },
        { kind: 'EventsNode', event: 'quiz_step_completed', name: 'Step 5 (Message)', properties: [{ key: 'step_number', value: 5, operator: 'exact', type: 'event' }] },
        { kind: 'EventsNode', event: 'quiz_step_completed', name: 'Step 6 (Language)', properties: [{ key: 'step_number', value: 6, operator: 'exact', type: 'event' }] },
        { kind: 'EventsNode', event: 'quiz_completed', name: 'Quiz Completed' },
      ],
      funnelOrderType: 'sequential',
      funnelWindowInterval: 1,
      funnelWindowIntervalUnit: 'day',
    },
  });

  await createInsight('Quiz Completions (Daily)', funnelDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { kind: 'EventsNode', event: 'quiz_completed', name: 'Quiz Completed' },
      ],
      interval: 'day',
    },
  });

  await createInsight('Avg Time on Step (by Step Name)', funnelDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        {
          kind: 'EventsNode',
          event: 'quiz_step_completed',
          name: 'Avg Time on Step',
          math: 'avg',
          math_property: 'time_on_step_ms',
        },
      ],
      interval: 'day',
      breakdownFilter: {
        breakdown_type: 'event',
        breakdown: 'step_name',
      },
    },
  });

  // ─── 2. Song Generation Health ──────────────────────────────────────────────
  const genDashId = await createDashboard(
    'Song Generation Health',
    'Monitor generation success/failure rates and timing',
  );

  await createInsight('Generation Completed vs Failed (Daily)', genDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { kind: 'EventsNode', event: 'song_generation_completed', name: 'Completed' },
        { kind: 'EventsNode', event: 'song_generation_failed', name: 'Failed' },
      ],
      interval: 'day',
    },
  });

  await createInsight('Avg Generation Time (ms)', genDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        {
          kind: 'EventsNode',
          event: 'song_generation_completed',
          name: 'Avg Generation Time',
          math: 'avg',
          math_property: 'generation_time_ms',
        },
      ],
      interval: 'day',
    },
  });

  // ─── 3. Song Engagement ─────────────────────────────────────────────────────
  const engDashId = await createDashboard(
    'Song Engagement',
    'Track how users interact with generated songs',
  );

  await createInsight('Song Plays by Source (Daily)', engDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { kind: 'EventsNode', event: 'song_played', name: 'Song Played' },
      ],
      interval: 'day',
      breakdownFilter: {
        breakdown_type: 'event',
        breakdown: 'source',
      },
    },
  });

  await createInsight('Song Play Completions (Daily)', engDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { kind: 'EventsNode', event: 'song_play_completed', name: 'Play Completed' },
      ],
      interval: 'day',
    },
  });

  await createInsight('Email Form Submissions (Daily)', engDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { kind: 'EventsNode', event: 'email_form_submitted', name: 'Email Sent' },
      ],
      interval: 'day',
    },
  });

  await createInsight('Listen Page Opens (Daily)', engDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { kind: 'EventsNode', event: 'listen_page_opened', name: 'Listen Page Opened' },
      ],
      interval: 'day',
    },
  });

  // ─── 4. Acquisition ────────────────────────────────────────────────────────
  const acqDashId = await createDashboard(
    'Acquisition',
    'Track landing page traffic and CTA effectiveness',
  );

  await createInsight('Quiz Pageviews (Daily)', acqDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        {
          kind: 'EventsNode',
          event: '$pageview',
          name: 'Quiz Pageviews',
          properties: [
            { key: '$current_url', value: '/quiz', operator: 'icontains', type: 'event' },
          ],
        },
      ],
      interval: 'day',
    },
  });

  await createInsight('CTA Clicks by Location (Daily)', acqDashId, {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series: [
        { kind: 'EventsNode', event: 'cta_clicked', name: 'CTA Clicked' },
      ],
      interval: 'day',
      breakdownFilter: {
        breakdown_type: 'event',
        breakdown: 'cta_location',
      },
    },
  });

  // ─── Done ──────────────────────────────────────────────────────────────────
  console.log('\nAll dashboards created successfully!\n');
  console.log('View them at:');
  console.log(`  ${API_BASE}/project/${PROJECT_ID}/dashboard/${funnelDashId}`);
  console.log(`  ${API_BASE}/project/${PROJECT_ID}/dashboard/${genDashId}`);
  console.log(`  ${API_BASE}/project/${PROJECT_ID}/dashboard/${engDashId}`);
  console.log(`  ${API_BASE}/project/${PROJECT_ID}/dashboard/${acqDashId}`);
}

main().catch((err) => {
  console.error('Failed to create dashboards:', err);
  process.exit(1);
});
