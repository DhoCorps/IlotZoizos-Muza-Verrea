import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingModal from '@/components/onboarding/OnBoardingModal';
import React from 'react';

// Mocks de Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe('UI Component : OnboardingModal (L’Éveil de l’Oiseau)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.alert = vi.fn();
  });

  it('🟢 doit ouvrir la modale si l’API confirme une nouvelle identité attribuée', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Identité attribuée avec succès',
        data: { pseudo: 'OiseauCosmique', frequenceHEX: '#FF5733' }
      })
    });

    render(<OnboardingModal userUid="bird_123" />);

    await waitFor(() => {
      expect(screen.getByText('L\'Éveil de l\'Oiseau')).toBeDefined();
      expect(screen.getByText('OiseauCosmique')).toBeDefined();
    });
  });

  it('🟢 doit effectuer un reroll en transmettant le coût en centimes (amountCents)', async () => {
    // 1er appel : init d'onboarding
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Identité attribuée avec succès',
        data: { pseudo: 'PremierNom', frequenceHEX: '#00FF00' }
      })
    });

    // 2ème appel : mutation de reroll
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { pseudo: 'NouveauNomDivin', frequenceHEX: '#0000FF' }
      })
    });

    render(<OnboardingModal userUid="bird_123" />);

    await waitFor(() => {
      expect(screen.getByText('PremierNom')).toBeDefined();
    });

    // Cliquer sur le bouton de reroll
    fireEvent.click(screen.getByRole('button', { name: /Hériter d'un autre Sobriquet/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenLastCalledWith('/api/oiseau/onboarding/reroll', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"amountCents"') // 🚀 Vérification de la structure en centimes
      }));
      expect(screen.getByText('NouveauNomDivin')).toBeDefined();
    });
  });
});