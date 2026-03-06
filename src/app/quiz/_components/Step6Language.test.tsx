import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step6Language } from './Step6Language';
import { INITIAL_QUIZ_DATA } from '@/lib/quiz-types';

describe('Step6Language', () => {
  const defaultProps = {
    data: { ...INITIAL_QUIZ_DATA },
    errors: {},
    updateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders language dropdown with 5 options (English, Spanish, French, Portuguese, Mandarin)', () => {
    render(<Step6Language {...defaultProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Spanish' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'French' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Portuguese' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mandarin' })).toBeInTheDocument();
  });

  it('English is selected by default', () => {
    render(<Step6Language {...defaultProps} data={{ ...INITIAL_QUIZ_DATA, language: 'English' }} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('English');
  });

  it('renders email input with honest label (Get notified about new features)', () => {
    render(<Step6Language {...defaultProps} />);
    expect(screen.getByText(/Get notified about new features/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });

  it('email field is optional — no error when empty', () => {
    render(<Step6Language {...defaultProps} errors={{}} />);
    const emailInput = screen.getByPlaceholderText('your@email.com');
    expect(emailInput).toBeInTheDocument();
    // No error message when errors is empty
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows error for invalid email format when errors.email is set', () => {
    render(
      <Step6Language
        {...defaultProps}
        errors={{ email: 'Please enter a valid email' }}
      />
    );
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
  });
});
