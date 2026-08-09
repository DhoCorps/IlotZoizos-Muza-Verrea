// apps/hub-central/app/[locale]/(inceptions)/marchand/useEcommerce.ts
'use client';

import { useState } from 'react';
import { ecommerce } from '@/lib/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useEcommerce() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-store' | 'barter'>('catalog');

  // 🌀 SUTURE REACT QUERY : Récupération parallélisée et mise en cache des produits
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['ecommerce-products'],
    queryFn: async () => await ecommerce.getProducts() || []
  });

  // 🌀 SUTURE REACT QUERY : Récupération des boutiques
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['ecommerce-stores'],
    queryFn: async () => await ecommerce.getStores() || []
  });

  // 🌀 SUTURE REACT QUERY : Récupération de la wishlist
  const { data: wishlistData, isLoading: wishlistLoading } = useQuery({
    queryKey: ['ecommerce-wishlist'],
    queryFn: async () => await ecommerce.getWishlist()
  });

  const wishlist = wishlistData?.productUids || [];
  const loading = productsLoading || storesLoading || wishlistLoading;

  const refreshEcommerce = () => {
    queryClient.invalidateQueries({ queryKey: ['ecommerce-products'] });
    queryClient.invalidateQueries({ queryKey: ['ecommerce-stores'] });
    queryClient.invalidateQueries({ queryKey: ['ecommerce-wishlist'] });
  };

  return {
    products,
    stores,
    wishlist,
    loading,
    activeTab,
    setActiveTab,
    refreshEcommerce
  };
}