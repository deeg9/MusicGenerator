import { render, screen, fireEvent } from '@testing-library/react';
import SuccessErrorBoundary from './error';

const mockError = new Error('Test error') as Error & { digest?: string };

describe('SuccessErrorBoundary', () => {
  it('renders the heading text', () => {
    const mockReset = vi.fn();
    render(<SuccessErrorBoundary error={mockError} reset={mockReset} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Something went wrong');
  });

  it('calls reset() when Try again button is clicked', () => {
    const mockReset = vi.fn();
    render(<SuccessErrorBoundary error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('renders a Go home link pointing to "/"', () => {
    const mockReset = vi.fn();
    render(<SuccessErrorBoundary error={mockError} reset={mockReset} />);
    const homeLink = screen.getByRole('link', { name: /go home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
