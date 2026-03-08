import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecipientEmailForm } from './RecipientEmailForm';

describe('RecipientEmailForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Send button is disabled when email input is empty', () => {
    render(<RecipientEmailForm songId="song-uuid-123" />);

    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeDisabled();
  });

  it('Send button is enabled when a valid email is entered', () => {
    render(<RecipientEmailForm songId="song-uuid-123" />);

    const input = screen.getByPlaceholderText('recipient@example.com');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    const button = screen.getByRole('button', { name: /send/i });
    expect(button).not.toBeDisabled();
  });

  it('Submitting calls POST /api/send-recipient-email with { songId, recipientEmail }', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<RecipientEmailForm songId="song-uuid-456" />);

    const input = screen.getByPlaceholderText('recipient@example.com');
    fireEvent.change(input, { target: { value: 'recipient@example.com' } });

    const button = screen.getByRole('button', { name: /send/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/send-recipient-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: 'song-uuid-456', recipientEmail: 'recipient@example.com' }),
      });
    });
  });

  it('Shows "Gift email sent!" confirmation after successful send', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<RecipientEmailForm songId="song-uuid-789" />);

    const input = screen.getByPlaceholderText('recipient@example.com');
    fireEvent.change(input, { target: { value: 'gift@example.com' } });

    const button = screen.getByRole('button', { name: /send/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Gift email sent!/i)).toBeInTheDocument();
    });
  });

  it('Shows error message when API returns non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<RecipientEmailForm songId="song-uuid-101" />);

    const input = screen.getByPlaceholderText('recipient@example.com');
    fireEvent.change(input, { target: { value: 'error@example.com' } });

    const button = screen.getByRole('button', { name: /send/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Could not send/i)).toBeInTheDocument();
    });
  });

  it('Privacy framing text "Private link -- no marketing, ever." is visible below input', () => {
    render(<RecipientEmailForm songId="song-uuid-202" />);

    expect(screen.getByText('Private link -- no marketing, ever.')).toBeInTheDocument();
  });
});
