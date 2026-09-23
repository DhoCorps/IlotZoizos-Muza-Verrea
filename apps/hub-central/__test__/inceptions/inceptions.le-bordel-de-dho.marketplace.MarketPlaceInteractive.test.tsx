import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarketPlaceInteractive } from '@/app/[locale]/(inceptions)/le-bordel-de-dho/marketPlace/MarketPlaceInteractive';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

// Mocks de la navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/marketplace',
}));

vi.mock('@/hooks/usePageChapeauContext', () => ({
  usePageChapeauContext: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/components/resonance/ResonanceButton', () => ({
  default: () => <button data-testid="resonance-btn">Suivre</button>,
}));

vi.mock('@/components/widget/OmniActionWidget', () => ({
  OmniActionWidget: ({ isOpen }: any) => isOpen ? <div data-testid="omni-widget">Widget Partage</div> : null,
}));

vi.mock('@/components/ecommerce/ProductComparator', () => ({
  ProductComparator: ({ products }: any) => (
    <div data-testid="product-comparator">
      Comparateur ({products.length})
    </div>
  ),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('Composant MarketPlaceInteractive', () => {
  const defaultFilters = { category: 'ALL', style: 'ALL', author: 'ALL', tagQuery: '' };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('doit rendre instantanément les produits fournis par le SSR via initialProducts', () => {
    const initialData = [{ uid: 'prod_1', title: 'Artefact Alpha SSR', priceCents: 1500, category: 'LORE', author: 'Test' }];
    
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MarketPlaceInteractive initialProducts={initialData} initialFilters={defaultFilters} />
      </QueryClientProvider>
    );

    // Les données SSR doivent être présentes immédiatement sans attendre le fetch
    expect(screen.getByText('Artefact Alpha SSR')).toBeDefined();
    expect(screen.queryByText(/Recensement des artefacts dans la silice/i)).toBeNull();
  });

  it('doit déclencher le fetch uniquement si les filtres changent et mettre à jour l’URL', async () => {
    // 🛡️ CORRECTION : Utilisation de mockResolvedValue au lieu de "Once" car React Query 
    // peut déclencher plusieurs fetch (hydratation + changement de filtre)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true, 
        data: [{ uid: 'prod_2', title: 'Epée Plasma Fetch', priceCents: 5000, category: 'WEAPON', author: 'Forgeron' }]
      }),
    } as any);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MarketPlaceInteractive initialProducts={[]} initialFilters={defaultFilters} />
      </QueryClientProvider>
    );

    const tagInput = screen.getByPlaceholderText('ex: cyberpunk, synth...');
    fireEvent.change(tagInput, { target: { value: 'cyberpunk' } });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('tag=cyberpunk'), { scroll: false });
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/ecommerce/marketPlace'));
    });

    expect(await screen.findByText('Epée Plasma Fetch')).toBeDefined();
  });

  it('doit gérer la limite du comparateur à 3 éléments et afficher le toast d’erreur', async () => {
    const initialData = [
      { uid: 'p1', title: 'Prod 1', priceCents: 1000, category: 'LORE' },
      { uid: 'p2', title: 'Prod 2', priceCents: 1000, category: 'LORE' },
      { uid: 'p3', title: 'Prod 3', priceCents: 1000, category: 'LORE' },
      { uid: 'p4', title: 'Prod 4', priceCents: 1000, category: 'LORE' },
    ];

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MarketPlaceInteractive initialProducts={initialData} initialFilters={defaultFilters} />
      </QueryClientProvider>
    );

    const compareBtns = screen.getAllByTitle('Comparer');
    
    fireEvent.click(compareBtns[0]);
    fireEvent.click(compareBtns[1]);
    fireEvent.click(compareBtns[2]);
    fireEvent.click(compareBtns[3]); // 4e clic = erreur

    expect(toast.error).toHaveBeenCalledWith('Limite de comparaison : 3 artefacts max.');
    expect(screen.getByText(/3 Artefact\(s\) prêt\(s\)/i)).toBeDefined();
  });
});