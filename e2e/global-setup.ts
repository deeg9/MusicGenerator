// Source: Playwright globalSetup pattern + dotenv docs
import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  // Load .env.local — same file the app reads at runtime
  // dotenv.config() with no options only reads .env, not .env.local — path: option is mandatory
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const heartmulaUrl = process.env.HEARTMULA_URL;

  if (!heartmulaUrl) {
    console.warn('[globalSetup] HEARTMULA_URL not set — generation tests will be skipped');
    process.env.POD_AVAILABLE = 'false';
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(heartmulaUrl, { signal: controller.signal });
    clearTimeout(timer);

    // Pod returns any 2xx/3xx/4xx — even 404 means it's reachable
    process.env.POD_AVAILABLE = 'true';
    console.log(`[globalSetup] A40 pod reachable (HTTP ${response.status}): ${heartmulaUrl}`);
  } catch (err) {
    process.env.POD_AVAILABLE = 'false';
    console.warn(`[globalSetup] A40 pod UNREACHABLE — generation tests will be skipped: ${err}`);
  }
}
