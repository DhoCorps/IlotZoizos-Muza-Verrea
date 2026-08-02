'use client';

import { useState, useEffect, useCallback } from 'react';
import { ecommerce } from '../../../../lib/apiClient';

export function useEcommerce() {
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-store' | 'barter'>('catalog');

  const fetchEcommerceData = useCallback(async () => {
    setLoading(true);
    try {
      const [resProd, resStore, resWish] = await Promise.all([
        ecommerce.getProducts(),
        ecommerce.getStores(),
        ecommerce.getWishlist()
      ]);

      setProducts(resProd || []);
      setStores(resStore || []);
      setWishlist(resWish?.productUids || []);
    } catch (err) {
      console.error("🌊 Fracture lors de la lecture du Marchand :", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEcommerceData();
  }, [fetchEcommerceData]);

  return {
    products,
    stores,
    wishlist,
    loading,
    activeTab,
    setActiveTab,
    refreshEcommerce: fetchEcommerceData
  };
}