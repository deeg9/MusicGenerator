import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step3Qualities } from './Step3Qualities';
import { INITIAL_QUIZ_DATA } from '@/lib/quiz-types';

describe('Step3Qualities', () => {
  const defaultProps = {
    data: { ...INITIAL_QUIZ_DATA },
    errors: {},
    updateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guiding questions above the textarea', () => {
    render(<Step3Qualities {...defaultProps} />);
    expect(screen.getByText('What are 3 words that describe them?')).toBeInTheDocument();
    expect(screen.getByText('What do they love doing?')).toBeInTheDocument();
    expect(screen.getByText('What makes them unlike anyone else?')).toBeInTheDocument();
  });

  it('textarea updates data.qualities on change', async () => {
    const updateData = vi.fn();
    render(<Step3Qualities {...defaultProps} updateData={updateData} />);
    const textarea = screen.getByPlaceholderText(/Kind, patient/i);
    await userEvent.type(textarea, 'kind');
    expect(updateData).toHaveBeenCalledWith({ qualities: expect.stringContaining('k') });
  });

  it('shows character count in format "X/500"', () => {
    render(<Step3Qualities {...defaultProps} />);
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  it('displays error when errors.qualities is set', () => {
    render(
      <Step3Qualities
        {...defaultProps}
        errors={{ qualities: 'Please write at least 20 characters' }}
      />
    );
    expect(screen.getByText('Please write at least 20 characters')).toBeInTheDocument();
  });
});
