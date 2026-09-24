import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore } from '../../../ecommerce/useWishListStore';

describe('Zustand Store : useWishlistStore', () => {
  beforeEach(() => {
    // Réinitialisation de l'état par défaut des wishlists
    useWishlistStore.setState({
      wishlists: [{ id: 'default', name: 'Favoris Principaux', productUids: [] }]
    });
  });

  it('🟢 doit basculer (toggle) un produit dans une liste de souhaits', () => {
    const store = useWishlistStore.getState();

    store.toggleItemInWishlist('default', 'prod_xyz');
    expect(store.isInWishlist('default', 'prod_xyz')).toBe(true);

    store.toggleItemInWishlist('default', 'prod_xyz');
    expect(store.isInWishlist('default', 'prod_xyz')).toBe(false);
  });
});