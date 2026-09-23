import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MarchandDashboard from '@/app/[locale]/(inceptions)/le-bordel-de-dho/page';
import { useEcommerce } from '@/app/[locale]/(inceptions)/le-bordel-de-dho/useEcommerce';
import { ecommerce } from '@/lib/apiClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// 🛡️ CORRECTION : Le chemin du mock est maintenant aligné avec l'import !
vi.mock('@/app/[locale]/(inceptions)/le-bordel-de-dho/useEcommerce', () => ({
  useEcommerce: vi.fn(),
}));

vi.mock('@/lib/apiClient', () => ({
  ecommerce: {
    getBarterOffers: vi.fn(),
    resolveBarter: vi.fn(),
    toggleWishlist: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mocks des sous-composants
vi.mock('@/components/ecommerce/stores/StoreCard', () => ({
  StoreCard: ({ store }: any) => <div data-testid="store-card">{store.storeName}</div>,
}));
vi.mock('@/components/ecommerce/stores/StoreForm', () => ({
  StoreForm: () => <div data-testid="store-form">Store Form</div>,
}));
vi.mock('@/components/ecommerce/products/ProductCard', () => ({
  ProductCard: ({ product }: any) => <div data-testid="product-card">{product.title}</div>,
}));
vi.mock('@/components/ecommerce/products/ProductForm', () => ({
  ProductForm: () => <div data-testid="product-form">Product Form</div>,
}));
vi.mock('@/components/ecommerce/barter/BarterCard', () => ({
  BarterCard: ({ offer }: any) => <div data-testid="barter-card">{offer.uid}</div>,
}));
vi.mock('@/components/ecommerce/barter/BarterForm', () => ({
  BarterForm: () => <div data-testid="barter-form">Barter Form</div>,
}));
vi.mock('@/components/resonance/ResonanceButton', () => ({
  default: () => <button>Resonance</button>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('MarchandDashboard - Tableau de bord', () => {
  const mockRefresh = vi.fn();
  const mockSetActiveTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ecommerce.getBarterOffers).mockResolvedValue([
      { uid: 'barter_1', initiatorUid: 'bird_1', offeredProductUids: ['p1'], requestedProductUids: ['p2'], status: 'PENDING' }
    ]);
  });

  it('doit rendre le tableau de bord avec les onglets et les produits du catalogue par défaut', async () => {
    vi.mocked(useEcommerce).mockReturnValue({
      products: [{ uid: 'prod_1', title: 'Artefact Majestueux', category: 'FONT_SPRITE' }],
      stores: [],
      wishlist: [],
      loading: false,
      activeTab: 'catalog',
      setActiveTab: mockSetActiveTab,
      refreshEcommerce: mockRefresh,
    } as any);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MarchandDashboard />
      </QueryClientProvider>
    );

    expect(screen.getByText('Boutiques, Artefacts & Échanges')).toBeDefined();
    expect(await screen.findByText('Artefact Majestueux')).toBeDefined();
    expect(screen.getByTestId('product-card')).toBeDefined();
  });

  it('doit permettre d’ouvrir la modale de création de boutique au clic', async () => {
    vi.mocked(useEcommerce).mockReturnValue({
      products: [],
      stores: [],
      wishlist: [],
      loading: false,
      activeTab: 'catalog',
      setActiveTab: mockSetActiveTab,
      refreshEcommerce: mockRefresh,
    } as any);

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MarchandDashboard />
      </QueryClientProvider>
    );

    const openStoreBtn = screen.getByRole('button', { name: /Ouvrir une Boutique/i });
    fireEvent.click(openStoreBtn);

    expect(await screen.findByTestId('store-form')).toBeDefined();
  });
});