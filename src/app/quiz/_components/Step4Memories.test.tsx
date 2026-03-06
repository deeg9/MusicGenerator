import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step4Memories } from './Step4Memories';
import { INITIAL_QUIZ_DATA } from '@/lib/quiz-types';

describe('Step4Memories', () => {
  const defaultProps = {
    data: { ...INITIAL_QUIZ_DATA },
    errors: {},
    updateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guiding questions above the textarea', () => {
    render(<Step4Memories {...defaultProps} />);
    expect(screen.getByText("What's your favorite memory together?")).toBeInTheDocument();
    expect(screen.getByText("Is there a moment that always makes you smile?")).toBeInTheDocument();
    expect(screen.getByText("What's something only you two would understand?")).toBeInTheDocument();
  });

  it('textarea updates data.memories on change', async () => {
    const updateData = vi.fn();
    render(<Step4Memories {...defaultProps} updateData={updateData} />);
    const textarea = screen.getByPlaceholderText(/got lost driving/i);
    await userEvent.type(textarea, 'that');
    expect(updateData).toHaveBeenCalledWith({ memories: expect.stringContaining('t') });
  });

  it('displays error when errors.memories is set', () => {
    render(
      <Step4Memories
        {...defaultProps}
        errors={{ memories: 'Please write at least 20 characters' }}
      />
    );
    expect(screen.getByText('Please write at least 20 characters')).toBeInTheDocument();
  });
});
