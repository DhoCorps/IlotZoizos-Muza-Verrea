import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarketPlacePage, { metadata } from '@/app/[locale]/(inceptions)/le-bordel-de-dho/marketPlace/page';
import React from 'react';

// On mocke le composant interactif lourd et le cache pour tester juste l'enveloppe SSR
vi.mock('@/app/[locale]/(inceptions)/le-bordel-de-dho/marketPlace/MarketPlaceInteractive', () => ({
  MarketPlaceInteractive: () => <div data-testid="marketplace-interactive">Grille Interactive</div>,
}));

vi.mock('@/lib/cache/ecommerce.cache', () => ({
  getCachedMarketplaceProducts: vi.fn().mockResolvedValue([]),
}));

describe('MarketPlacePage (SSR Server Component)', () => {
  it('doit exposer les métadonnées statiques pour le SEO', () => {
    // Ton fichier exporte const metadata: Metadata, on la vérifie directement
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('Le Grand Bazar | Îlot Zoizos');
  });

  it('doit rendre le composant interactif MarketPlaceInteractive au sein de la page SSR en recevant des searchParams', async () => {
    // 🛡️ CORRECTION : Passage de la prop searchParams sous forme de promesse (Next 15+)
    const mockSearchParams = Promise.resolve({ category: 'ALL' });
    
    const ui = await MarketPlacePage({ searchParams: mockSearchParams });
    render(ui);

    // Vérifie que le composant client a bien été monté
    expect(screen.getByTestId('marketplace-interactive')).toBeDefined();
  });
});