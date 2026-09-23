import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WishlistPage from '@/app/[locale]/(inceptions)/le-bordel-de-dho/wishlist/page';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn(),
}));

vi.mock('@/components/widget/OmniActionWidget', () => ({
  OmniActionWidget: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="omni-widget">Widget Ouvert</div> : null,
}));

vi.mock('@/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('WishlistPage - Sanctuaire des Envies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('doit afficher l’état vide (Aucun Trésor) si aucune wishlist n’est renvoyée par l’API', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as any);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WishlistPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Aucun Trésor')).toBeDefined();
    expect(screen.getByText('Explorer la Matrice')).toBeDefined();
  });

  it('doit charger et afficher les listes de souhaits ainsi que les artefacts associés', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { uid: 'list_1', name: 'Favoris Principaux', productUids: ['prod_1'] },
          ],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { 
              uid: 'prod_1', 
              title: 'Parchemin Ancien', 
              priceCents: 2000, 
              category: 'LORE_SCROLL', 
              description: 'Un texte mystique.' 
            },
          ],
        }),
      } as any);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WishlistPage />
      </QueryClientProvider>
    );

    // 🛡️ CORRECTION : findAllByText au lieu de findByText car l'élément est présent deux fois (Titre + Menu)
    const favorisElements = await screen.findAllByText('Favoris Principaux');
    expect(favorisElements.length).toBeGreaterThan(0);
    expect(await screen.findByText('Parchemin Ancien')).toBeDefined();
    expect(screen.getByText('20.00 EUR')).toBeDefined();
  });
});