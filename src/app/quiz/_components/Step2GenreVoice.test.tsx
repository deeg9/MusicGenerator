import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step2GenreVoice } from './Step2GenreVoice';
import { INITIAL_QUIZ_DATA } from '@/lib/quiz-types';

describe('Step2GenreVoice', () => {
  const defaultProps = {
    data: { ...INITIAL_QUIZ_DATA },
    errors: {},
    updateData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 6-8 genre cards with labels and mood descriptors', () => {
    render(<Step2GenreVoice {...defaultProps} />);
    // Check genre labels
    expect(screen.getByText('Pop')).toBeInTheDocument();
    expect(screen.getByText('R&B / Soul')).toBeInTheDocument();
    expect(screen.getByText('Folk / Acoustic')).toBeInTheDocument();
    expect(screen.getByText('Rock')).toBeInTheDocument();
    expect(screen.getByText('Hip-Hop')).toBeInTheDocument();
    expect(screen.getByText('Classical')).toBeInTheDocument();
    expect(screen.getByText('Country')).toBeInTheDocument();
    // Check mood descriptors
    expect(screen.getByText('Upbeat and fun')).toBeInTheDocument();
    expect(screen.getByText('Smooth and heartfelt')).toBeInTheDocument();
    expect(screen.getByText('Warm and intimate')).toBeInTheDocument();
  });

  it('clicking a genre card calls updateData with that genre', async () => {
    const updateData = vi.fn();
    render(<Step2GenreVoice {...defaultProps} updateData={updateData} />);
    await userEvent.click(screen.getByText('Pop'));
    expect(updateData).toHaveBeenCalledWith({ genre: 'Pop' });
  });

  it('renders 3 voice preference pill buttons (Male, Female, No Preference)', () => {
    render(<Step2GenreVoice {...defaultProps} />);
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('No Preference')).toBeInTheDocument();
  });

  it('clicking a voice pill calls updateData with that preference', async () => {
    const updateData = vi.fn();
    render(<Step2GenreVoice {...defaultProps} updateData={updateData} />);
    await userEvent.click(screen.getByText('Male'));
    expect(updateData).toHaveBeenCalledWith({ voicePreference: 'Male' });
  });

  it('renders error message when errors.genre is set', () => {
    render(
      <Step2GenreVoice
        {...defaultProps}
        errors={{ genre: 'Please select a music genre' }}
      />
    );
    expect(screen.getByText('Please select a music genre')).toBeInTheDocument();
  });
});
