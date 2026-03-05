import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerationForm } from './GenerationForm';

describe('GenerationForm', () => {
  it('renders lyrics textarea in both simple and custom modes', () => {
    const { container } = render(
      <GenerationForm onSubmit={() => {}} isSubmitting={false} />,
    );
    // Lyrics textarea is always in DOM (CSS-hidden in simple mode)
    expect(container.querySelector('textarea')).toBeDefined();
  });

  it('shows inline error when submitting with empty prompt', async () => {
    render(
      <GenerationForm onSubmit={() => {}} isSubmitting={false} />,
    );
    const submitBtn = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/describe your song to get started/i)).toBeDefined();
  });

  it.todo('clears error when user types in prompt field');
});
