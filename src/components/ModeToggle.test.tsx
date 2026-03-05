import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeToggle } from './ModeToggle';

describe('ModeToggle', () => {
  it('renders Simple and Custom buttons', () => {
    render(<ModeToggle mode="simple" onChange={() => {}} />);
    expect(screen.getByText('Simple')).toBeDefined();
    expect(screen.getByText('Custom')).toBeDefined();
  });

  it('calls onChange with "custom" when Custom button is clicked', () => {
    const onChange = vi.fn();
    render(<ModeToggle mode="simple" onChange={onChange} />);
    fireEvent.click(screen.getByText('Custom'));
    expect(onChange).toHaveBeenCalledWith('custom');
  });

  it('calls onChange with "simple" when Simple button is clicked', () => {
    const onChange = vi.fn();
    render(<ModeToggle mode="custom" onChange={onChange} />);
    fireEvent.click(screen.getByText('Simple'));
    expect(onChange).toHaveBeenCalledWith('simple');
  });

  it.todo('renders sliding indicator positioned on active mode');
});
