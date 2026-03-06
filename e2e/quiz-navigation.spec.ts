import { test, expect } from '@playwright/test';
import { QuizPage } from './pages/quiz';
import { VALID_QUIZ_DATA, STEP_HEADINGS } from './fixtures';

test.describe('Quiz Navigation', () => {
  let quiz: QuizPage;

  test.beforeEach(async ({ page }) => {
    quiz = new QuizPage(page);
    await quiz.goto();
    await page.evaluate(() => localStorage.clear());
  });

  test('completes all 6 steps with valid input', async ({ page }) => {
    // Step 0: Relationship + Name
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await expect(quiz.step1NameInput).toHaveValue(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();

    // Step 1: Genre + Voice
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.genre);
    await quiz.clickNext();

    // Step 2: Qualities
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await expect(quiz.step3TextArea).toHaveValue(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();

    // Step 3: Memories
    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();
    await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
    await expect(quiz.step4TextArea).toHaveValue(VALID_QUIZ_DATA.memories);
    await quiz.clickNext();

    // Step 4: Message
    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();
    await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
    await expect(quiz.step5TextArea).toHaveValue(VALID_QUIZ_DATA.message);
    await quiz.clickNext();

    // Step 5: Language + Email (last step)
    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();
    await expect(quiz.createSongButton).toBeVisible();
    // Do NOT click createSongButton — that triggers generation (Phase 21 scope)
  });

  test('back button navigates to previous step', async ({ page }) => {
    // Fill step 0 and advance to step 1
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await expect(quiz.step1NameInput).toHaveValue(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();

    // Confirm we are on step 1
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();

    // Click back — should return to step 0
    await quiz.clickBack();
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();

    // Name input should still have the entered value (state preserved)
    await expect(quiz.step1NameInput).toHaveValue(VALID_QUIZ_DATA.recipientName);
  });

  test('forward-back-forward preserves state across multiple steps', async ({ page }) => {
    // Seed VALID_QUIZ_DATA into localStorage so it is available on load
    await page.evaluate((data) => {
      localStorage.setItem('notevra_quiz_v1', JSON.stringify(data));
    }, VALID_QUIZ_DATA);

    // Reload so the quiz picks up the seeded data
    await page.reload();

    // Step 0: data pre-loaded — select Mom and fill name (confirms seed worked)
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await expect(quiz.step1NameInput).toHaveValue(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();

    // Step 1: select genre and advance
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.genre);
    await quiz.clickNext();

    // Step 2: fill qualities and advance
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await expect(quiz.step3TextArea).toHaveValue(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();

    // Now on step 3: click back twice to return to step 1
    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();
    await quiz.clickBack();
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
    await quiz.clickBack();
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();

    // On step 1: genre 'Pop' should still be selected (aria-pressed='true')
    await expect(
      page.locator(`button:has(span:text-is("${VALID_QUIZ_DATA.genre}"))`)
    ).toHaveAttribute('aria-pressed', 'true');

    // Go back one more step to step 0
    await quiz.clickBack();
    await expect(quiz.getStepHeading(STEP_HEADINGS[0])).toBeVisible();

    // Step 0 state: 'Mom' should be selected, name should be 'Maria'
    await expect(
      page.locator(`button:has(span:text-is("${VALID_QUIZ_DATA.relationshipType}"))`)
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(quiz.step1NameInput).toHaveValue(VALID_QUIZ_DATA.recipientName);

    // Advance forward — step 1 should show with genre 'Pop' still selected
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
    await expect(
      page.locator(`button:has(span:text-is("${VALID_QUIZ_DATA.genre}"))`)
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
