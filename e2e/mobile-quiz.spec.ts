import { test, expect } from '@playwright/test';
import { QuizPage } from './pages/quiz';
import { VALID_QUIZ_DATA, STEP_HEADINGS } from './fixtures';

// Viewport comes from the --project flag (mobile-iphone = iPhone SE = 375px)
// Do NOT use test.use() or page.setViewportSize() here

test.describe('Quiz — mobile responsiveness (MOB-02)', () => {

  test('no horizontal overflow on quiz page', async ({ page }) => {
    const quiz = new QuizPage(page);
    await quiz.goto();
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('SelectionCard touch targets meet 44px', async ({ page }) => {
    const quiz = new QuizPage(page);
    await quiz.goto();
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();

    const card = page.locator('button[aria-pressed]').first();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('Next button touch target meets 44px', async ({ page }) => {
    const quiz = new QuizPage(page);
    await quiz.goto();
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();

    const box = await quiz.nextButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('Back button touch target meets 44px', async ({ page }) => {
    const quiz = new QuizPage(page);
    await quiz.goto();
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();

    // Advance to step 2: select relationship, fill name, click Next
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();

    const box = await quiz.backButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('all 6 quiz steps are completable at mobile viewport', async ({ page }) => {
    const quiz = new QuizPage(page);
    await quiz.goto();
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();

    // Step 1: Relationship type + name
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();

    // Step 2: Genre + voice preference
    // Genre uses SelectionCard (button with span), voice uses PillButton (direct text)
    await quiz.selectOption(VALID_QUIZ_DATA.genre);
    // Scroll to voice preference section and select via direct button role
    const voiceButton = page.getByRole('button', { name: VALID_QUIZ_DATA.voicePreference, exact: true });
    await voiceButton.scrollIntoViewIfNeeded();
    await voiceButton.click();
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();

    // Step 3: Qualities
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();

    // Step 4: Memories
    await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();

    // Step 5: Message
    await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();

    // Step 6: "Almost there!" heading is visible — do NOT click Create My Song
    // (avoids hitting the generation API)

    // Verify no horizontal overflow at step 6
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  });

});
