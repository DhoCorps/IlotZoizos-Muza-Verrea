import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../../ecommerce/useCartStore';

describe('Zustand Store : useCartStore (Panier ERP en centimes)', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('🟢 doit ajouter un article avec des prix en centimes et gérer les quantités', () => {
    const store = useCartStore.getState();
    
    store.addItem({
      uid: 'p_1',
      title: 'Livre de Philosophie',
      priceEURCents: 1999, // 19.99 €
      priceShardsCents: 500
    });

    let items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].priceEURCents).toBe(1999);
    expect(items[0].quantity).toBe(1);

    // Incrémentation automatique si réajouté
    store.addItem({ uid: 'p_1', title: 'Livre de Philosophie' });
    items = useCartStore.getState().items;
    expect(items[0].quantity).toBe(2);
  });
});