import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step1Relationship } from './Step1Relationship';
import { INITIAL_QUIZ_DATA } from '@/lib/quiz-types';

describe('Step1Relationship', () => {
  const defaultProps = {
    data: { ...INITIAL_QUIZ_DATA },
    errors: {},
    updateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 6 relationship type cards (Mom, Dad, Partner, Friend, Child, Other)', () => {
    render(<Step1Relationship {...defaultProps} />);
    expect(screen.getByText('Mom')).toBeInTheDocument();
    expect(screen.getByText('Dad')).toBeInTheDocument();
    expect(screen.getByText('Partner')).toBeInTheDocument();
    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('clicking a relationship card calls updateData with that type', async () => {
    const updateData = vi.fn();
    render(<Step1Relationship {...defaultProps} updateData={updateData} />);
    await userEvent.click(screen.getByText('Mom'));
    expect(updateData).toHaveBeenCalledWith({ relationshipType: 'Mom' });
  });

  it('renders a text input for recipient name', () => {
    render(<Step1Relationship {...defaultProps} />);
    const input = screen.getByPlaceholderText('Their first name');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('renders error messages when errors prop contains relationshipType or recipientName keys', () => {
    render(
      <Step1Relationship
        {...defaultProps}
        errors={{
          relationshipType: 'Please select who this song is for',
          recipientName: 'Please enter their name',
        }}
      />
    );
    expect(
      screen.getByText('Please select who this song is for')
    ).toBeInTheDocument();
    expect(screen.getByText('Please enter their name')).toBeInTheDocument();
  });
});
