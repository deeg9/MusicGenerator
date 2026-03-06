import { type Page, type Locator } from '@playwright/test';

export class SuccessPage {
  readonly page: Page;

  readonly loadingHeading: Locator;
  readonly readyHeading: Locator;
  readonly audioPlayer: Locator;
  readonly downloadButton: Locator;

  readonly errorHeading: Locator;
  readonly podDownHeading: Locator;
  readonly tryAgainButton: Locator;
  readonly startOverButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loadingHeading = page.getByRole('heading', { name: /creating your song/i });
    this.readyHeading = page.getByRole('heading', { name: /your song is ready/i });
    this.audioPlayer = page.locator('audio');
    this.downloadButton = page.getByRole('link', { name: /download/i });

    this.errorHeading = page.getByRole('heading', { name: /something went wrong creating your song/i });
    this.podDownHeading = page.getByRole('heading', { name: /our servers are temporarily offline/i });
    this.tryAgainButton = page.getByRole('button', { name: /try again/i });
    this.startOverButton = page.getByRole('button', { name: /start over/i });
  }

  async goto(jobId: string, name?: string) {
    const url = name
      ? `/quiz/success/${jobId}?name=${encodeURIComponent(name)}`
      : `/quiz/success/${jobId}`;
    await this.page.goto(url);
  }
}
