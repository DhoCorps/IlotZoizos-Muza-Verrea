import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RaffleDrawAnimation } from '@/components/raffle/RaffleDrawAnimation';

describe('RaffleDrawAnimation Component', () => {
  it('doit initialiser l’animation de décryptage matriciel', () => {
    render(<RaffleDrawAnimation winnerPseudo="DhÖ_Master" />);

    expect(screen.getByText(/Auscultation du Hasard Souverain/i)).toBeDefined();
  });

  it('doit révéler le pseudo du gagnant à la fin de l’animation', async () => {
    const mockComplete = vi.fn();
    render(<RaffleDrawAnimation winnerPseudo="DhÖ_Master" onRevealComplete={mockComplete} />);

    await waitFor(() => {
      expect(screen.getByText('DhÖ_Master')).toBeDefined();
      expect(screen.getByText(/Le karma a parlé/i)).toBeDefined();
      expect(mockComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});