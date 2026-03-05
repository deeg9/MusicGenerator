import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingAnimation, STAGE_LABELS } from './LoadingAnimation';

describe('LoadingAnimation', () => {
  it('renders stage label for given stageIndex', () => {
    render(<LoadingAnimation stageIndex={0} />);
    expect(screen.getByText('Initializing')).toBeDefined();
  });

  it('renders all equalizer bars', () => {
    const { container } = render(<LoadingAnimation stageIndex={1} />);
    // 7 bars expected
    const bars = container.querySelectorAll('[class*="animate-eq-bar"]');
    expect(bars.length).toBe(7);
  });

  it('shows Generating label for stageIndex 1', () => {
    render(<LoadingAnimation stageIndex={1} />);
    expect(screen.getByText('Generating')).toBeDefined();
  });

  it('shows Finalizing label for stageIndex 2', () => {
    render(<LoadingAnimation stageIndex={2} />);
    expect(screen.getByText('Finalizing')).toBeDefined();
  });

  it('exports STAGE_LABELS array with 3 entries', () => {
    expect(STAGE_LABELS).toHaveLength(3);
    expect(STAGE_LABELS).toEqual(['Initializing', 'Generating', 'Finalizing']);
  });
});
