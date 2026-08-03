// packages/shared-core/src/ecommerce/useWishlistStore.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Wishlist {
  id: string;
  name: string;
  productUids: string[];
}

interface WishlistState {
  wishlists: Wishlist[];
  createWishlist: (name: string) => void;
  deleteWishlist: (id: string) => void;
  toggleItemInWishlist: (wishlistId: string, productUid: string) => void;
  isInWishlist: (wishlistId: string, productUid: string) => boolean;
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
      deleteWishlist: (id) => {
        // Empêcher de supprimer la liste par défaut si on veut
        if (id === 'default') return;
        set({
          wishlists: get().wishlists.filter(w => w.id !== id)
        });
      },
      toggleItemInWishlist: (wishlistId, productUid) => {
        set({
          wishlists: get().wishlists.map(wl => {
            if (wl.id !== wishlistId) return wl;
            const exists = wl.productUids.includes(productUid);
            return {
              ...wl,
              productUids: exists 
                ? wl.productUids.filter(id => id !== productUid)
                : [...wl.productUids, productUid]
            };
          })
        });
      },
      isInWishlist: (wishlistId, productUid) => {
        const wl = get().wishlists.find(w => w.id === wishlistId);
        return wl ? wl.productUids.includes(productUid) : false;
      }
    }),
    { name: 'ilot-wishlists-storage' }
  )
);