import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../ecommerce/useCartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    useCartStore.getState().setCurrency('EUR');
  });

  it('🟢 doit ajouter un produit et incrémenter la quantité si déjà présent', () => {
    const store = useCartStore.getState();
    
    store.addItem({ uid: 'p-1', slug: 'synthe-moog', title: 'Synthétiseur', priceEUR: 500 });
    store.addItem({ uid: 'p-1', slug: 'synthe-moog', title: 'Synthétiseur', priceEUR: 500 });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].productSlug).toBe('synthe-moog');
  });

  it('🟢 doit permettre de décrémenter et de supprimer un article', () => {
    const store = useCartStore.getState();
    store.addItem({ uid: 'p-1', title: 'Disque Vinyle', priceEUR: 25 });
    
    store.addItem({ uid: 'p-1', title: 'Disque Vinyle', priceEUR: 25 });
    expect(useCartStore.getState().items[0].quantity).toBe(2);

    store.decrementItem('p-1');
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    store.decrementItem('p-1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});