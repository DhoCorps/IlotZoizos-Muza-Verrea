import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductDetailInteractive } from '@/app/[locale]/(inceptions)/le-bordel-de-dho/[slug]/ProductDetailInteractive';
import { useCartStore } from '@ilot/shared-core';
import { toast } from 'sonner';
import React from 'react';

// 🛡️ Mock des dépendances et stores globaux
vi.mock('@ilot/shared-core', () => ({
  useCartStore: vi.fn(),
  UniversalGridCanvas: () => <div data-testid="grid-canvas">Canvas Modulaire</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock('@/components/ecommerce/wishlist/AddWishListButton', () => ({
  AddToWishlistButton: () => <button data-testid="wishlist-btn">Wishlist</button>,
}));

vi.mock('@/components/widget/OmniActionWidget', () => ({
  OmniActionWidget: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="omni-widget">Widget Ouvert</div> : null,
}));

vi.mock('@/components/ecommerce/roulette/KarmaRouletteModal', () => ({
  KarmaRouletteModal: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="roulette-modal">Roue Ouverte</div> : null,
}));

describe('Composant ProductDetailInteractive', () => {
  const mockAddItem = vi.fn();
  const sampleProduct = {
    uid: 'prod_999',
    title: 'Parchemin Cybernétique',
    description: 'Un artefact puissant forgé dans l’Îlot.',
    priceCents: 4500, // 45.00 €
    stock: 7,
    category: 'LORE_SCROLL',
    thumbnailUrl: 'https://example.com/parchemin.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCartStore).mockReturnValue({
      addItem: mockAddItem,
    } as any);
  });

  it('doit rendre les détails de l’artefact et les prix convertis correctement', () => {
    render(<ProductDetailInteractive product={sampleProduct} />);

    expect(screen.getByText('Parchemin Cybernétique')).toBeDefined();
    expect(screen.getByText('Un artefact puissant forgé dans l’Îlot.')).toBeDefined();
    expect(screen.getByText('45.00 EUR')).toBeDefined();
    expect(screen.getByText(/Stock : 7/i)).toBeDefined();
    expect(screen.getByTestId('wishlist-btn')).toBeDefined();
  });

  it('doit ajouter l’artefact au panier et déclencher un toast lors du clic sur acquisition', () => {
    render(<ProductDetailInteractive product={sampleProduct} />);

    const acquireBtn = screen.getByRole('button', { name: /Acquérir l'Artefact/i });
    fireEvent.click(acquireBtn);

    expect(mockAddItem).toHaveBeenCalledWith({
      uid: 'prod_999',
      title: 'Parchemin Cybernétique',
      priceEUR: 45,
      priceShards: 450,
      category: 'LORE_SCROLL',
    });
    expect(toast.success).toHaveBeenCalledWith('✨ Artefact ajouté à votre panier.');
  });

  it('doit ouvrir la Roue Karmique au clic sur le bouton dédié', () => {
    render(<ProductDetailInteractive product={sampleProduct} />);

    expect(screen.queryByTestId('roulette-modal')).toBeNull();

    const rouletteBtn = screen.getByRole('button', { name: /Roue Karmique/i });
    fireEvent.click(rouletteBtn);

    expect(screen.getByTestId('roulette-modal')).toBeDefined();
  });

  it('doit ouvrir le Widget d’interaction au clic sur Partager', () => {
    render(<ProductDetailInteractive product={sampleProduct} />);

    expect(screen.queryByTestId('omni-widget')).toBeNull();

    const shareBtn = screen.getByRole('button', { name: /Interagir & Partager/i });
    fireEvent.click(shareBtn);

    expect(screen.getByTestId('omni-widget')).toBeDefined();
  });
});