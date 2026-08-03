// apps/hub-central/app/[locale]/(inceptions)/ecommerce/layout.tsx
'use client';

import React, { useState } from 'react';
import { CartDrawer } from '../../../../../components/ecommerce/cart/CartDrawer';
import { useCartStore } from '@ilot/shared-core';
import { ShoppingBag, Sparkles, FolderHeart } from 'lucide-react';
import { Link } from '../../../../../navigation';

export default function EcommercePublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 relative overflow-x-hidden selection:bg-[#E5484D] selection:text-white">
      
      {/* 🌌 Fonds matriciels & lueurs synaptiques */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-[#E5484D]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* 🛒 En-tête Flottant de la Boutique */}
      <header className="sticky top-4 z-40 max-w-6xl mx-auto px-4 my-4">
        <div className="p-4 bg-black/60 border border-white/10 rounded-2xl backdrop-blur-2xl flex items-center justify-between shadow-2xl">
          
          <Link href="/marketplace" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-[#E5484D]/10 border border-[#E5484D]/30 rounded-xl group-hover:scale-105 transition-transform">
              <Sparkles size={16} className="text-[#E5484D]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase tracking-widest text-white group-hover:text-[#E5484D] transition-colors block">
                Le Grand Bazar
              </span>
              <span className="text-[9px] font-mono text-slate-500 block">E-commerce & Artefacts</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-mono text-xs rounded-xl border border-white/10 transition-all flex items-center gap-2"
            >
              <ShoppingBag size={14} className="text-[#E5484D]" />
              <span className="hidden sm:inline font-bold uppercase">Panier</span>
              {totalCount > 0 && (
                <span className="px-2 py-0.5 bg-[#E5484D] text-white text-[10px] font-black rounded-full shadow-[0_0_10px_rgba(229,72,77,0.5)]">
                  {totalCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Page publique (catalogue ou [slug]) */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-4">
        {children}
      </main>

      {/* Tiroir de panier global pour toute la boutique */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

    </div>
  );
}