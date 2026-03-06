import { test, expect } from '@playwright/test';
import { QuizPage } from './pages/quiz';
import { VALID_QUIZ_DATA, STEP_HEADINGS } from './fixtures';

// Helper: fill a step with valid data and advance to the next step.
// stepIndex is 0-based (0 = relationship/name, 1 = genre/voice, etc.)
async function fillStepAndAdvance(quiz: QuizPage, stepIndex: number) {
  switch (stepIndex) {
    case 0:
      await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
      await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
      await expect(quiz.step1NameInput).toHaveValue(VALID_QUIZ_DATA.recipientName);
      await quiz.clickNext();
      break;
    case 1:
      await quiz.selectOption(VALID_QUIZ_DATA.genre);
      await quiz.clickNext();
      break;
    case 2:
      await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
      await expect(quiz.step3TextArea).toHaveValue(VALID_QUIZ_DATA.qualities);
      await quiz.clickNext();
      break;
    case 3:
      await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
      await expect(quiz.step4TextArea).toHaveValue(VALID_QUIZ_DATA.memories);
      await quiz.clickNext();
      break;
    case 4:
      await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
      await expect(quiz.step5TextArea).toHaveValue(VALID_QUIZ_DATA.message);
      await quiz.clickNext();
      break;
    // Step 5 (index 5) is the last step — no advance needed for validation tests
  }
}

test.describe('Quiz Validation', () => {
  let quiz: QuizPage;

  test.beforeEach(async ({ page }) => {
    quiz = new QuizPage(page);
    await quiz.goto();
    await page.evaluate(() => localStorage.clear());
  });

  test('step 1 rejects empty relationship and name', async ({ page }) => {
    // Click Next without selecting anything — should reject
    await quiz.clickNext();
    await expect(quiz.errorAlert).toBeVisible();

    // Select relationship but leave name empty — still reject
    await quiz.selectOption('Mom');
    await quiz.clickNext();
    await expect(quiz.errorAlert).toBeVisible();

    // Fill name with minimum 1 char — should advance
    await quiz.step1NameInput.fill('M');
    await expect(quiz.step1NameInput).toHaveValue('M');
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
  });

  test('step 2 rejects empty genre', async ({ page }) => {
    // Advance past step 1 with valid data
    await fillStepAndAdvance(quiz, 0);
    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();

    // Click Next without selecting genre — should reject
    await quiz.clickNext();
    await expect(quiz.errorAlert).toBeVisible();

    // Select genre — should advance
    await quiz.selectOption('Pop');
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
  });

  test('step 3 rejects short qualities', async ({ page }) => {
    // Navigate to step 3 (index 2)
    await fillStepAndAdvance(quiz, 0);
    await fillStepAndAdvance(quiz, 1);
    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();

    // Type only 5 chars — should reject
    await quiz.step3TextArea.fill('Hello');
    await expect(quiz.step3TextArea).toHaveValue('Hello');
    await quiz.clickNext();
    await expect(quiz.errorAlert).toBeVisible();

    // Fill with 20+ chars — should advance
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await expect(quiz.step3TextArea).toHaveValue(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();
  });

  test('step 4 rejects short memories', async ({ page }) => {
    // Navigate to step 4 (index 3)
    await fillStepAndAdvance(quiz, 0);
    await fillStepAndAdvance(quiz, 1);
    await fillStepAndAdvance(quiz, 2);
    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();

    // Type only 5 chars — should reject
    await quiz.step4TextArea.fill('Hello');
    await expect(quiz.step4TextArea).toHaveValue('Hello');
    await quiz.clickNext();
    await expect(quiz.errorAlert).toBeVisible();

    // Fill with 20+ chars — should advance
    await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
    await expect(quiz.step4TextArea).toHaveValue(VALID_QUIZ_DATA.memories);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();
  });

  test('step 5 rejects short message', async ({ page }) => {
    // Navigate to step 5 (index 4)
    await fillStepAndAdvance(quiz, 0);
    await fillStepAndAdvance(quiz, 1);
    await fillStepAndAdvance(quiz, 2);
    await fillStepAndAdvance(quiz, 3);
    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();

    // Type only 5 chars — should reject
    await quiz.step5TextArea.fill('Hello');
    await expect(quiz.step5TextArea).toHaveValue('Hello');
    await quiz.clickNext();
    await expect(quiz.errorAlert).toBeVisible();

    // Fill with 20+ chars — should advance
    await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
    await expect(quiz.step5TextArea).toHaveValue(VALID_QUIZ_DATA.message);
    await quiz.clickNext();
    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();
  });

  test('step 6 rejects invalid email', async ({ page }) => {
    // Navigate to step 6 (index 5 — last step)
    await fillStepAndAdvance(quiz, 0);
    await fillStepAndAdvance(quiz, 1);
    await fillStepAndAdvance(quiz, 2);
    await fillStepAndAdvance(quiz, 3);
    await fillStepAndAdvance(quiz, 4);
    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();

    // Fill invalid email and click Create My Song — should reject
    await quiz.step6EmailInput.fill('not-an-email');
    await expect(quiz.step6EmailInput).toHaveValue('not-an-email');
    await quiz.createSongButton.click();
    await expect(quiz.errorAlert).toBeVisible();

    // Clear email field (valid state — email is optional but must be valid if filled)
    await quiz.step6EmailInput.fill('');
  });
});
