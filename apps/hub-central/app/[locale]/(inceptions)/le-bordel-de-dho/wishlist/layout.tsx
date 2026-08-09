// apps/hub-central/app/[locale]/(inceptions)/ecommerce/wishlist/layout.tsx
'use client';

import React from 'react';
import { Heart } from 'lucide-react';

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
      
      {/* Aura Bio-Tech */}
      <div className="absolute top-0 left-0 w-[600px] h-[500px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header className="border-b border-red-900/30 pb-6">
          <div className="flex items-center gap-3">
            <Heart className="text-red-500 fill-red-500/20" size={32} />
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-600 tracking-tighter">
              Mes Trésors
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-2">Les artefacts qui ont résonné avec votre conscience.</p>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}