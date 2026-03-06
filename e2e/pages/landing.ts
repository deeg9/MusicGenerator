import { type Page, type Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;

  // Hero
  readonly heroHeading: Locator;
  readonly heroCtaButton: Locator;
  readonly navCreateButton: Locator;

  // Sections
  readonly howItWorksSection: Locator;

  // Nav links
  readonly howItWorksLink: Locator;
  readonly examplesLink: Locator;
  readonly reviewsLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heroHeading = page.getByRole('heading', { name: /turn your feelings into a song/i });
    this.heroCtaButton = page.getByRole('link', { name: /create your song/i }).first();
    this.navCreateButton = page.getByRole('link', { name: /create your song/i }).nth(1);

    this.howItWorksSection = page.locator('#how-it-works');

    this.howItWorksLink = page.getByRole('link', { name: 'How it Works', exact: true }).first();
    this.examplesLink = page.getByRole('link', { name: 'Examples', exact: true }).first();
    this.reviewsLink = page.getByRole('link', { name: 'Reviews', exact: true }).first();
  }

  async goto() {
    await this.page.goto('/');
  }
}
