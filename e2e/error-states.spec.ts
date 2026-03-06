import { test, expect } from '@playwright/test';
import { SuccessPage } from './pages/success';
import { QuizPage } from './pages/quiz';
import { VALID_QUIZ_DATA, STEP_HEADINGS } from './fixtures';

test.describe('Error State E2E', () => {
  // E2E-06: Generation failure on success page
  test('generation failure shows friendly error with retry action', async ({ page }) => {
    // Register route mock BEFORE navigation so the mock is in place when the page starts polling.
    // Research Pitfall 4: mock returns FAILED synchronously — loading heading may already be gone
    // before the assertion can run, so we skip asserting the loading state here.
    await page.route('/api/poll-job/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'FAILED', error: null }),
      });
    });

    const success = new SuccessPage(page);
    await success.goto('test-job-error-sim', 'Maria');

    // Error heading must be visible after the poll completes
    await expect(success.errorHeading).toBeVisible({ timeout: 10_000 });

    // Try Again button must be visible (links back to /quiz)
    await expect(success.tryAgainButton).toBeVisible();

    // No infinite spinner — loading heading must not be present.
    // NOTE: success.loadingHeading uses /creating your song/i which also matches the error heading
    // text "Something went wrong creating your song". Use a more specific pattern here that targets
    // only the loading state text ("Creating your song for...") to avoid a false-positive match.
    await expect(page.getByRole('heading', { name: /^creating your song/i })).not.toBeVisible();
  });

  // E2E-07: Pod offline — 502 from quiz-generate stays on quiz page
  test('pod offline during quiz submit shows graceful error -- not blank page', async ({ page }) => {
    // Register route mock BEFORE navigation so 502 fires when createSongButton is clicked
    await page.route('/api/quiz-generate', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            category: 'gpu_unavailable',
            retryable: true,
            userMessage: 'The generation server is temporarily unavailable.',
          },
          debug: { technicalMessage: '[redacted]' },
        }),
      });
    });

    const quiz = new QuizPage(page);
    await quiz.goto();

    // Step 0: Relationship + Name
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();

    // Step 1: Genre + Voice
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.genre);
    await quiz.clickNext();

    // Step 2: Qualities
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();

    // Step 3: Memories
    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();
    await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
    await quiz.clickNext();

    // Step 4: Message
    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();
    await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
    await quiz.clickNext();

    // Step 5: Language + Email (last step)
    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();
    await quiz.createSongButton.click();

    // The quiz page error overlay should appear — the userMessage from the API response
    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible({ timeout: 10_000 });

    // Try Again button must be visible in the error overlay
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();

    // User must stay on /quiz — not navigated to success page
    await expect(page).toHaveURL(/\/quiz$/);

    // Page title must not indicate an error page
    await expect(page).not.toHaveTitle(/error/i);
  });
});
