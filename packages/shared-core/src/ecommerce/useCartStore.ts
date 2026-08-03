// packages/shared-core/src/ecommerce/useCartStore.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productUid: string;
  title: string;
  priceEUR: number;
  priceShards: number;
  quantity: number;
  category: string;
}

interface CartState {
  items: CartItem[];
  currency: 'EUR' | 'SHARDS';
  setCurrency: (currency: 'EUR' | 'SHARDS') => void;
  addItem: (product: {
    uid: string;
    title: string;
    priceEUR?: number;
    priceShards?: number;
    category?: string;
  }) => void;
  removeItem: (productUid: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      currency: 'EUR',
      setCurrency: (currency) => set({ currency }),
      addItem: (product) => {
        const currentItems = get().items;
        const existing = currentItems.find(i => i.productUid === product.uid);
        
        if (existing) {
          set({
            items: currentItems.map(i => 
              i.productUid === product.uid ? { ...i, quantity: i.quantity + 1 } : i
            )
          });
        } else {
          set({
            items: [...currentItems, {
              productUid: product.uid,
              title: product.title,
              priceEUR: product.priceEUR || 0,
              priceShards: product.priceShards || 0,
              quantity: 1,
              category: product.category || 'PHYSICAL'
            }]
          });
        }
      },
      removeItem: (productUid) => {
        set({ items: get().items.filter(i => i.productUid !== productUid) });
      },
      clearCart: () => set({ items: [] })
    }),
    { 
      name: 'ilot-cart-storage' 
    }
  )
);