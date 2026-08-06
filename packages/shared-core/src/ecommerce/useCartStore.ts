// packages/shared-core/src/ecommerce/useCartStore.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productUid: string;
  productSlug?: string;
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
    slug?: string;
    title: string;
    priceEUR?: number;
    priceShards?: number;
    category?: string;
  }) => void;
  removeItem: (productUidOrSlug: string) => void;
  updateQuantity: (productUidOrSlug: string, quantity: number) => void;
  decrementItem: (productUidOrSlug: string) => void;
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
        const existing = currentItems.find(
          i => i.productUid === product.uid || (product.slug && i.productSlug === product.slug)
        );
        
        if (existing) {
          set({
            items: currentItems.map(i => 
              (i.productUid === product.uid || (product.slug && i.productSlug === product.slug))
                ? { ...i, quantity: i.quantity + 1 } 
                : i
            )
          });
        } else {
          set({
            items: [...currentItems, {
              productUid: product.uid,
              productSlug: product.slug,
              title: product.title,
              priceEUR: product.priceEUR || 0,
              priceShards: product.priceShards || 0,
              quantity: 1,
              category: product.category || 'PHYSICAL'
            }]
          });
        }
      },

      removeItem: (identifier) => {
        set({ 
          items: get().items.filter(i => i.productUid !== identifier && i.productSlug !== identifier) 
        });
      },

      updateQuantity: (identifier, quantity) => {
        if (quantity <= 0) {
          get().removeItem(identifier);
          return;
        }
        set({
          items: get().items.map(i =>
            (i.productUid === identifier || i.productSlug === identifier)
              ? { ...i, quantity }
              : i
          )
        });
      },

      decrementItem: (identifier) => {
        const currentItems = get().items;
        const target = currentItems.find(i => i.productUid === identifier || i.productSlug === identifier);
        
        if (!target) return;

        if (target.quantity <= 1) {
          get().removeItem(identifier);
        } else {
          set({
            items: currentItems.map(i =>
              (i.productUid === identifier || i.productSlug === identifier)
                ? { ...i, quantity: i.quantity - 1 }
                : i
            )
          });
        }
      },

      clearCart: () => set({ items: [] })
    }),
    { 
      name: 'ilot-cart-storage' 
    }
  )
);