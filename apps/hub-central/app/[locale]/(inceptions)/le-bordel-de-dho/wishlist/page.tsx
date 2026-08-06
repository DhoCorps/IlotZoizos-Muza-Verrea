// apps/hub-central/app/[locale]/(inceptions)/ecommerce/wishlist/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Loader2, PackageX, ArrowLeft } from 'lucide-react';
import { Link } from '../../../../../navigation';
import { ProductCard } from '../../../../../components/ecommerce/products/ProductCard'; // Assure-toi que ce chemin correspond
import { useWishlistStore } from '@ilot/shared-core';
import { ecommerce } from '../../../../../lib/apiClient';

export default function WishlistPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { wishlists, toggleItemInWishlist, isInWishlist } = useWishlistStore();

  useEffect(() => {
    // Dans un cas réel, cette route d'API devrait te renvoyer les objets *peuplés* de la wishlist.
    // Par exemple: GET /api/ecommerce/wishlist/products
    ecommerce.getProducts()
      .then(allProducts => {
        // On simule le peuplement en filtrant le catalogue localement pour l'exemple
        const allWishlistedUids = wishlists.flatMap(w => w.productUids);
        const filtered = allProducts.filter(p => allWishlistedUids.includes(p.uid));
        setProducts(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [wishlists]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <Link href="/marketplace" className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
          <ArrowLeft size={14} /> Retour au Bazar
        </Link>

        <header className="border-b border-red-900/30 pb-6">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-600 tracking-tighter flex items-center gap-3">
            <Heart className="text-red-500 fill-red-500/20" size={32} />
            Mes Trésors (Wishlists)
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Les artefacts qui ont résonné avec votre conscience.
          </p>
        </header>

        {products.length === 0 ? (
          <div className="py-24 text-center space-y-4 bg-slate-900/30 border border-slate-800 rounded-3xl">
            <PackageX className="w-12 h-12 mx-auto text-slate-600" />
            <h2 className="text-lg font-bold text-slate-300 uppercase">Aucun trésor conservé</h2>
            <p className="text-xs font-mono text-slate-500">
              Parcourez le Grand Marché pour ajouter des artefacts à vos wishlists.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => {
              // Vérifier si le produit est dans au moins une wishlist locale
              const isWishlisted = wishlists.some(w => w.productUids.includes(product.uid));
              
              return (
                <ProductCard 
                  key={product.uid} 
                  product={product} 
                  isWishlisted={isWishlisted} 
                  onToggleWishlist={(uid) => {
                    // Toggle dans la première wishlist par défaut pour l'exemple
                    if (wishlists.length > 0) {
                      toggleItemInWishlist(wishlists[0].id, uid);
                    }
                  }} 
                />
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}