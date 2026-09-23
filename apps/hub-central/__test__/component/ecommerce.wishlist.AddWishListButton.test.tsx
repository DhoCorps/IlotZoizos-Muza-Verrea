import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToWishlistButton } from '@/components/ecommerce/wishlist/AddWishListButton';
import { useWishlistStore } from '@ilot/shared-core';
import React from 'react';

vi.mock('@ilot/shared-core', () => ({
  useWishlistStore: vi.fn(),
}));

describe('Composant AddToWishlistButton', () => {
  const mockCreateWishlist = vi.fn();
  const mockToggleItem = vi.fn();
  const mockIsInWishlist = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWishlistStore).mockReturnValue({
      wishlists: [{ id: 'wl_1', name: 'Trésors Cyber' }],
      createWishlist: mockCreateWishlist,
      toggleItemInWishlist: mockToggleItem,
      isInWishlist: mockIsInWishlist,
    } as any);
  });

  it('doit ouvrir le menu et afficher les listes existantes au clic', () => {
    mockIsInWishlist.mockReturnValue(false);
    render(<AddToWishlistButton productUid="prod_1" />);

    expect(screen.queryByText('Mes Wishlists')).toBeNull();

    // 🛡️ CORRECTION : On cherche le nom accessible exact du bouton, qui est "Wishlist"
    const mainBtn = screen.getByRole('button', { name: /Wishlist/i });
    fireEvent.click(mainBtn);

    expect(screen.getByText('Mes Wishlists')).toBeDefined();
    expect(screen.getByText('Trésors Cyber')).toBeDefined();
  });

  it('doit permettre de basculer un item dans une liste', () => {
    mockIsInWishlist.mockReturnValue(false);
    render(<AddToWishlistButton productUid="prod_1" />);
    
    // 🛡️ CORRECTION
    fireEvent.click(screen.getByRole('button', { name: /Wishlist/i }));
    
    const listBtn = screen.getByText('Trésors Cyber');
    fireEvent.click(listBtn);

    expect(mockToggleItem).toHaveBeenCalledWith('wl_1', 'prod_1');
  });

  it('doit permettre de créer une nouvelle liste', () => {
    render(<AddToWishlistButton productUid="prod_1" />);
    
    // 🛡️ CORRECTION
    fireEvent.click(screen.getByRole('button', { name: /Wishlist/i }));
    fireEvent.click(screen.getByRole('button', { name: /Nouvelle liste/i }));

    const input = screen.getByPlaceholderText('Nom de la nouvelle liste...');
    fireEvent.change(input, { target: { value: 'Équipement Gacha' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }));

    expect(mockCreateWishlist).toHaveBeenCalledWith('Équipement Gacha');
  });
});