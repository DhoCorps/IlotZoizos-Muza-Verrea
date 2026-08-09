// apps/hub-central/app/[locale]/(inceptions)/ecommerce/wishlist/page.tsx
'use client';

import React, { useMemo } from 'react';
import { Loader2, PackageX, ArrowLeft } from 'lucide-react';
import { Link } from '@/navigation';
import { ProductCard } from '@/components/ecommerce/products/ProductCard';
import { useWishlistStore } from '@ilot/shared-core';
import { ecommerce } from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function WishlistPage() {
  const { wishlists, toggleItemInWishlist } = useWishlistStore();

  // 🌀 SUTURE REACT QUERY : On récupère tout le catalogue pour filtrer
  // React Query mettra en cache ces données efficacement.
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['marketplace-products'],
    queryFn: async () => await ecommerce.getProducts()
  });

  // 🧪 Calcul mémorisé : filtrage des produits présents dans les wishlists
  const products = useMemo(() => {
    const allWishlistedUids = wishlists.flatMap(w => w.productUids);
    return allProducts.filter(p => allWishlistedUids.includes(p.uid));
  }, [allProducts, wishlists]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Link href="/marketplace" className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
        <ArrowLeft size={14} /> Retour au Bazar
      </Link>

      {products.length === 0 ? (
        <div className="py-24 text-center space-y-4 bg-slate-900/30 border border-slate-800 rounded-3xl">
          <PackageX className="w-12 h-12 mx-auto text-slate-600" />
          <h2 className="text-lg font-bold text-slate-300 uppercase">Aucun trésor conservé</h2>
          <p className="text-xs font-mono text-slate-500">Parcourez le Grand Marché pour ajouter des artefacts à vos wishlists.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => {
            const isWishlisted = wishlists.some(w => w.productUids.includes(product.uid));
            
            return (
              <ProductCard 
                key={product.uid} 
                product={product} 
                isWishlisted={isWishlisted} 
                onToggleWishlist={(uid) => {
                  if (wishlists.length > 0) {
                    toggleItemInWishlist(wishlists[0].id, uid);
                    toast.success("✨ Artefact mis à jour dans vos trésors.");
                  }
                }} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
}