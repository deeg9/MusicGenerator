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

  it('renders all 15 genre cards with labels and mood descriptors', () => {
    render(<Step2GenreVoice {...defaultProps} />);
    // Original 7 genres
    expect(screen.getByText('Pop')).toBeInTheDocument();
    expect(screen.getByText('R&B / Soul')).toBeInTheDocument();
    expect(screen.getByText('Folk / Acoustic')).toBeInTheDocument();
    expect(screen.getByText('Rock')).toBeInTheDocument();
    expect(screen.getByText('Hip-Hop')).toBeInTheDocument();
    expect(screen.getByText('Classical')).toBeInTheDocument();
    expect(screen.getByText('Country')).toBeInTheDocument();
    // 8 new genres
    expect(screen.getByText('Jazz')).toBeInTheDocument();
    expect(screen.getByText('Electronic')).toBeInTheDocument();
    expect(screen.getByText('Latin')).toBeInTheDocument();
    expect(screen.getByText('Reggae')).toBeInTheDocument();
    expect(screen.getByText('Blues')).toBeInTheDocument();
    expect(screen.getByText('Gospel')).toBeInTheDocument();
    expect(screen.getByText('Indie')).toBeInTheDocument();
    expect(screen.getByText('Lullaby')).toBeInTheDocument();
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

  it('renders 5 voice preference pills including Duet and Choir', () => {
    render(<Step2GenreVoice {...defaultProps} />);
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Duet')).toBeInTheDocument();
    expect(screen.getByText('Choir')).toBeInTheDocument();
    expect(screen.getByText('No Preference')).toBeInTheDocument();
  });

  it('clicking a voice pill calls updateData with that preference', async () => {
    const updateData = vi.fn();
    render(<Step2GenreVoice {...defaultProps} updateData={updateData} />);
    await userEvent.click(screen.getByText('Male'));
    expect(updateData).toHaveBeenCalledWith({ voicePreference: 'Male' });
  });

  it('renders energy level pills (Low, Medium, High)', () => {
    render(<Step2GenreVoice {...defaultProps} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('clicking energy pill calls updateData with energy value', async () => {
    const updateData = vi.fn();
    render(<Step2GenreVoice {...defaultProps} updateData={updateData} />);
    await userEvent.click(screen.getByText('High'));
    expect(updateData).toHaveBeenCalledWith({ energy: 'high' });
  });

  it('clicking selected energy pill deselects (calls updateData with empty string)', async () => {
    const updateData = vi.fn();
    render(
      <Step2GenreVoice
        {...defaultProps}
        data={{ ...INITIAL_QUIZ_DATA, energy: 'high' }}
        updateData={updateData}
      />
    );
    await userEvent.click(screen.getByText('High'));
    expect(updateData).toHaveBeenCalledWith({ energy: '' });
  });

  it('renders instrumental toggle', () => {
    render(<Step2GenreVoice {...defaultProps} />);
    expect(screen.getByText('Instrumental only (no vocals)')).toBeInTheDocument();
  });

  it('clicking instrumental toggle calls updateData', async () => {
    const updateData = vi.fn();
    render(<Step2GenreVoice {...defaultProps} updateData={updateData} />);
    const toggle = screen.getByRole('switch');
    await userEvent.click(toggle);
    expect(updateData).toHaveBeenCalledWith({ instrumental: true });
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
