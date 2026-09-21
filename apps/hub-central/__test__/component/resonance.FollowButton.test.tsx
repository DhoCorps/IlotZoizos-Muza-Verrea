import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FollowButton } from '@/components/resonance/FollowButton';
import React from 'react';

describe('Composant : FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('🟢 doit afficher "S\'abonner" par défaut et basculer en "Suivi" après un clic réussi', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Succès' }),
    });

    render(<FollowButton targetUid="target-123" targetType="USER" initialIsFollowing={false} />);

    const button = screen.getByRole('button', { name: /S'abonner/i });
    expect(button).toBeDefined();
    expect(button.textContent).toContain("S'abonner");

    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/resonance/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: 'target-123', targetType: 'USER', action: 'FOLLOW' }),
      });
    });

    const updatedButton = screen.getByRole('button', { name: /Se désabonner/i });
    expect(updatedButton.textContent).toContain('Suivi');
  });

  it('🟢 doit afficher "Suivi" par défaut et basculer en "S\'abonner" en cas d\'Unfollow', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Rompu' }),
    });

    render(<FollowButton targetUid="target-123" targetType="PROJECT" initialIsFollowing={true} />);

    const button = screen.getByRole('button', { name: /Se désabonner/i });
    expect(button.textContent).toContain('Suivi');

    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/resonance/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: 'target-123', targetType: 'PROJECT', action: 'UNFOLLOW' }),
      });
    });

    const updatedButton = screen.getByRole('button', { name: /S'abonner/i });
    expect(updatedButton.textContent).toContain("S'abonner");
  });
});