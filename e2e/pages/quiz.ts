import { type Page, type Locator } from '@playwright/test';

export class QuizPage {
  readonly page: Page;

  // Navigation buttons
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly createSongButton: Locator;

  // Step 1: Relationship + Name
  readonly step1NameInput: Locator;

  // Step 3: Qualities (step index 2)
  readonly step3TextArea: Locator;

  // Step 4: Memories (step index 3)
  readonly step4TextArea: Locator;

  // Step 5: Message (step index 4)
  readonly step5TextArea: Locator;

  // Step 6: Language + Email (step index 5)
  readonly step6LanguageSelect: Locator;
  readonly step6EmailInput: Locator;

  // Validation
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nextButton = page.getByRole('button', { name: 'Next', exact: true });
    this.backButton = page.getByRole('button', { name: /back/i });
    this.createSongButton = page.getByRole('button', { name: /create my song/i });

    this.step1NameInput = page.getByPlaceholder('Their first name');

    this.step3TextArea = page.getByPlaceholder(/kind, patient/i);
    this.step4TextArea = page.getByPlaceholder(/got lost driving/i);
    this.step5TextArea = page.getByPlaceholder(/I don't say it enough/i);

    this.step6LanguageSelect = page.getByRole('combobox');
    this.step6EmailInput = page.getByPlaceholder('your@email.com');

    // Exclude the Next.js route announcer (aria-live="assertive") which also has role="alert"
    this.errorAlert = page.locator('[role="alert"]:not(#__next-route-announcer__)').first();
  }

  async goto() {
    await this.page.goto('/quiz');
  }

  async selectOption(label: string) {
    // SelectionCards may have a subLabel — use has-text to target the button containing the label span
    await this.page.locator(`button:has(span:text-is("${label}"))`).click();
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async clickBack() {
    await this.backButton.click();
  }

  getStepHeading(text: string): Locator {
    return this.page.getByRole('heading', { name: text });
  }
}
