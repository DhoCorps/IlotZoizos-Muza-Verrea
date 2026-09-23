import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartDrawer } from '@/components/ecommerce/cart/CartDrawer';
import { useCartStore } from '@ilot/shared-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import React from 'react';

vi.mock('@ilot/shared-core', () => ({
  useCartStore: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('Composant CartDrawer', () => {
  const mockOnClose = vi.fn();
  const mockSetCurrency = vi.fn();
  const mockRemoveItem = vi.fn();
  const mockClearCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    vi.mocked(useCartStore).mockReturnValue({
      items: [
        { productUid: 'prod_1', title: 'Artefact Alpha', quantity: 1, priceEUR: 15, priceShards: 150 },
        { productUid: 'prod_2', title: 'Artefact Beta', quantity: 2, priceEUR: 10, priceShards: 100 }
      ],
      currency: 'EUR',
      setCurrency: mockSetCurrency,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
    } as any);
  });

  it('ne doit rien rendre si isOpen est false', () => {
    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CartDrawer isOpen={false} onClose={mockOnClose} />
      </QueryClientProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('doit rendre le panier, les articles et calculer le total correctement en EUR', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CartDrawer isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>
    );
    
    expect(screen.getByText("Panier de l'Îlot")).toBeDefined();
    expect(screen.getByText('Artefact Alpha')).toBeDefined();
    expect(screen.getByText('Quantité : 1 × 15 €')).toBeDefined();
    expect(screen.getByText('Artefact Beta')).toBeDefined();
    
    // Total: (1 * 15) + (2 * 10) = 35
    expect(screen.getByText('35 €')).toBeDefined();
  });

  it('doit afficher l’état vide si aucun article n’est présent', () => {
    vi.mocked(useCartStore).mockReturnValueOnce({
      items: [],
      currency: 'EUR',
      setCurrency: mockSetCurrency,
      removeItem: mockRemoveItem,
      clearCart: mockClearCart,
    } as any);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CartDrawer isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Votre panier est vide dans cette dimension/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sceller la Commande/i }).hasAttribute('disabled')).toBe(true);
  });

  it('doit appeler setCurrency lors du clic sur le changement de devise', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CartDrawer isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>
    );

    const shardsBtn = screen.getByRole('button', { name: /Payer en Éclats/i });
    fireEvent.click(shardsBtn);

    expect(mockSetCurrency).toHaveBeenCalledWith('SHARDS');
  });

  it('doit appeler removeItem avec le bon UID au clic sur la poubelle', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CartDrawer isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>
    );

    const removeBtn = screen.getByRole('button', { name: /Retirer Artefact Alpha/i });
    fireEvent.click(removeBtn);

    expect(mockRemoveItem).toHaveBeenCalledWith('prod_1');
  });

  it('doit exécuter le checkout, vider le panier et fermer le drawer en cas de succès', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, orderId: 'ord_999' }),
    } as any);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CartDrawer isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>
    );

    const checkoutBtn = screen.getByRole('button', { name: /Sceller la Commande/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Commande validée'));
    expect(mockClearCart).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});