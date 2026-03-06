import { test, expect } from '@playwright/test';
import { QuizPage } from './pages/quiz';
import { SuccessPage } from './pages/success';
import { VALID_QUIZ_DATA, STEP_HEADINGS } from './fixtures';

test.describe('Happy Path E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quiz');
    await page.evaluate(() => localStorage.clear());
  });

  test('full funnel: quiz completion to generation to success page with audio', async ({ page }) => {
    test.skip(process.env.POD_AVAILABLE !== 'true', 'A40 pod not reachable -- skipping generation test');
    test.setTimeout(120_000);

    const quiz = new QuizPage(page);
    const success = new SuccessPage(page);

    // Step 1: Relationship + Name
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();

    // Step 2: Genre
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.genre);
    await quiz.clickNext();

    // Step 3: Qualities
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();

    // Step 4: Memories
    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();
    await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
    await quiz.clickNext();

    // Step 5: Message
    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();
    await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
    await quiz.clickNext();

    // Step 6: Language + Email (final step)
    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();
    await expect(quiz.createSongButton).toBeVisible();

    // Trigger generation
    await quiz.createSongButton.click();

    // Wait for navigation to /quiz/success/[jobId]
    await page.waitForURL(/\/quiz\/success\/.+/, { timeout: 30_000 });

    // Loading state should be visible initially
    await expect(success.loadingHeading).toBeVisible();

    // Wait for generation to complete (up to 90s polling)
    await expect(success.readyHeading).toBeVisible({ timeout: 90_000 });

    // Audio player should be attached (native <audio> has no visual pixels)
    await expect(success.audioPlayer).toBeAttached();

    // Download link should be visible
    await expect(success.downloadButton).toBeVisible();
  });
});
