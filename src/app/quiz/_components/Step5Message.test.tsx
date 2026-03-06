import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step5Message } from './Step5Message';
import { INITIAL_QUIZ_DATA } from '@/lib/quiz-types';

describe('Step5Message', () => {
  const defaultProps = {
    data: { ...INITIAL_QUIZ_DATA },
    errors: {},
    updateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guiding questions above the textarea', () => {
    render(<Step5Message {...defaultProps} />);
    expect(screen.getByText('What do you want them to know?')).toBeInTheDocument();
    expect(screen.getByText("What have you always wanted to say?")).toBeInTheDocument();
    expect(screen.getByText('How do they make your life better?')).toBeInTheDocument();
  });

  it('textarea updates data.message on change', async () => {
    const updateData = vi.fn();
    render(<Step5Message {...defaultProps} updateData={updateData} />);
    const textarea = screen.getByPlaceholderText(/don't say it enough/i);
    await userEvent.type(textarea, 'you');
    expect(updateData).toHaveBeenCalledWith({ message: expect.stringContaining('y') });
  });

  it('displays error when errors.message is set', () => {
    render(
      <Step5Message
        {...defaultProps}
        errors={{ message: 'Please write at least 20 characters' }}
      />
    );
    expect(screen.getByText('Please write at least 20 characters')).toBeInTheDocument();
  });
});
