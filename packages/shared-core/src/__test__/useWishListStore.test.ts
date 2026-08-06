import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore } from '../ecommerce/useWishListStore';

describe('useWishlistStore', () => {
  beforeEach(() => {
    // Réinitialiser l'état par défaut des wishlists
    useWishlistStore.setState({
      wishlists: [{ id: 'default', name: 'Favoris Principaux', productUids: [] }]
    });
  });

  it('🟢 doit basculer (toggle) un produit dans une wishlist', () => {
    const store = useWishlistStore.getState();
    
    expect(store.isInWishlist('default', 'prod-slug-1')).toBe(false);

    store.toggleItemInWishlist('default', 'prod-slug-1');
    expect(store.isInWishlist('default', 'prod-slug-1')).toBe(true);

    store.toggleItemInWishlist('default', 'prod-slug-1');
    expect(store.isInWishlist('default', 'prod-slug-1')).toBe(false);
  });

  it('🟢 doit créer et renommer une wishlist personnalisée', () => {
    const store = useWishlistStore.getState();
    
    store.createWishlist('Matos Audio');
    const lists = useWishlistStore.getState().wishlists;
    expect(lists).toHaveLength(2);
    
    const newId = lists[1].id;
    store.renameWishlist(newId, 'Studio Gear');
    expect(useWishlistStore.getState().wishlists[1].name).toBe('Studio Gear');
  });
});