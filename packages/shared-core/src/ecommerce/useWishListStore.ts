// packages/shared-core/src/ecommerce/useWishlistStore.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Wishlist {
  id: string;
  name: string;
  productUids: string[]; // Supporte uids ou slugs
}

interface WishlistState {
  wishlists: Wishlist[];
  createWishlist: (name: string) => void;
  renameWishlist: (id: string, newName: string) => void;
  deleteWishlist: (id: string) => void;
  toggleItemInWishlist: (wishlistId: string, productIdentifier: string) => void;
  isInWishlist: (wishlistId: string, productIdentifier: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlists: [
        { id: 'default', name: 'Favoris Principaux', productUids: [] }
      ],
      
      createWishlist: (name) => {
        const newId = `wl_${Date.now()}`;
        set({
          wishlists: [...get().wishlists, { id: newId, name, productUids: [] }]
        });
      },

      renameWishlist: (id, newName) => {
        set({
          wishlists: get().wishlists.map(w => w.id === id ? { ...w, name: newName } : w)
        });
      },

      deleteWishlist: (id) => {
        if (id === 'default') return;
        set({
          wishlists: get().wishlists.filter(w => w.id !== id)
        });
      },

      toggleItemInWishlist: (wishlistId, productIdentifier) => {
        set({
          wishlists: get().wishlists.map(wl => {
            if (wl.id !== wishlistId) return wl;
            const exists = wl.productUids.includes(productIdentifier);
            return {
              ...wl,
              productUids: exists 
                ? wl.productUids.filter(id => id !== productIdentifier)
                : [...wl.productUids, productIdentifier]
            };
          })
        });
      },

      isInWishlist: (wishlistId, productIdentifier) => {
        const wl = get().wishlists.find(w => w.id === wishlistId);
        return wl ? wl.productUids.includes(productIdentifier) : false;
      }
    }),
    { name: 'ilot-wishlists-storage' }
  )
);