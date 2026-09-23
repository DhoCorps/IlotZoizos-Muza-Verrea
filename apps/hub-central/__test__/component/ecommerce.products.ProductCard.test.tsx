import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '@/components/ecommerce/products/ProductCard';

describe('Composant ProductCard', () => {
  const mockProduct = {
    uid: 'prod_1',
    title: 'Clavier Mécanique',
    description: 'Switches tactiles et rétroéclairage.',
    category: 'PHYSICAL_ARTIFACT',
    priceCents: 8900,
    tags: ['clavier', 'hardware']
  };

  const mockToggleWishlist = vi.fn();

  it('doit afficher correctement les informations du produit, le prix formaté et les tags', () => {
    render(<ProductCard product={mockProduct} isWishlisted={false} onToggleWishlist={mockToggleWishlist} />);

    expect(screen.getByText('Clavier Mécanique')).toBeDefined();
    expect(screen.getByText('Switches tactiles et rétroéclairage.')).toBeDefined();
    expect(screen.getByText('89.00 €')).toBeDefined();
    expect(screen.getByText('clavier')).toBeDefined();
    expect(screen.getByText('hardware')).toBeDefined();
  });

  it('doit déclencher la fonction toggle wishlist au clic sur le bouton cœur', () => {
    render(<ProductCard product={mockProduct} isWishlisted={false} onToggleWishlist={mockToggleWishlist} />);

    // Ciblage précis du bouton grâce au aria-label "Favoris"
    const heartButton = screen.getByRole('button', { name: /favoris/i });
    fireEvent.click(heartButton);

    expect(mockToggleWishlist).toHaveBeenCalledWith('prod_1');
  });
});