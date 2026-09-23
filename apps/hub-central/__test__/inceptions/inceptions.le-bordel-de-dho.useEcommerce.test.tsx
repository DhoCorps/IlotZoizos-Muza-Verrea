import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEcommerce } from '@/app/[locale]/(inceptions)/le-bordel-de-dho/useEcommerce';
import { ecommerce } from '@/lib/apiClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/apiClient', () => ({
  ecommerce: {
    getProducts: vi.fn(),
    getStores: vi.fn(),
    getWishlist: vi.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Hook useEcommerce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit initialiser avec l’onglet catalogue par défaut et charger les données', async () => {
    vi.mocked(ecommerce.getProducts).mockResolvedValueOnce([{ uid: 'p1', title: 'Artefact 1' }]);
    vi.mocked(ecommerce.getStores).mockResolvedValueOnce([{ uid: 's1', storeName: 'Boutique 1' }]);
    vi.mocked(ecommerce.getWishlist).mockResolvedValueOnce({ productUids: ['p1'] });

    const { result } = renderHook(() => useEcommerce(), { wrapper });

    expect(result.current.activeTab).toBe('catalog');
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toEqual([{ uid: 'p1', title: 'Artefact 1' }]);
    expect(result.current.stores).toEqual([{ uid: 's1', storeName: 'Boutique 1' }]);
    expect(result.current.wishlist).toEqual(['p1']);
  });

  it('doit permettre de changer l’onglet actif dynamiquement', () => {
    vi.mocked(ecommerce.getProducts).mockResolvedValue([]);
    vi.mocked(ecommerce.getStores).mockResolvedValue([]);
    vi.mocked(ecommerce.getWishlist).mockResolvedValue({ productUids: [] });

    const { result } = renderHook(() => useEcommerce(), { wrapper });

    expect(result.current.activeTab).toBe('catalog');

    act(() => {
      result.current.setActiveTab('my-store');
    });

    expect(result.current.activeTab).toBe('my-store');

    act(() => {
      result.current.setActiveTab('barter');
    });

    expect(result.current.activeTab).toBe('barter');
  });
});