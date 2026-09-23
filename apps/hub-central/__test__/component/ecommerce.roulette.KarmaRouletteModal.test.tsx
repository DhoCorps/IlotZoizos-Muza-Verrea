import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KarmaRouletteModal } from '@/components/ecommerce/roulette/KarmaRouletteModal';

describe('Composant KarmaRouletteModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('ne doit rien rendre si isOpen est false', () => {
    const { container } = render(
      <KarmaRouletteModal productUid="prod_1" productTitle="Synthétiseur" isOpen={false} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('doit afficher l’avertissement des 24h et le titre de l’artefact', () => {
    render(
      <KarmaRouletteModal productUid="prod_1" productTitle="Synthétiseur" isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('La Roue Karmique')).toBeDefined();
    expect(screen.getByText('Synthétiseur')).toBeDefined();
    expect(screen.getByText(/Sans achat sous 24h, la mise financera le vendeur et l'Îlot./i)).toBeDefined();
  });

  it('doit appeler l’API /spin[cite: 4] et afficher le prix secret obtenu', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          sessionUid: 'sess_123',
          priceCents: 1250,
          expiresAt: futureDate
        }
      })
    } as any);

    render(
      <KarmaRouletteModal productUid="prod_1" productTitle="Synthétiseur" isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const spinButton = screen.getByRole('button', { name: /Faire tourner la Roue/i });
    fireEvent.click(spinButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ecommerce/roulette/spin', expect.any(Object));
      expect(screen.getByText('12.50 €')).toBeDefined();
      expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({ priceCents: 1250 }));
    });
  });
});