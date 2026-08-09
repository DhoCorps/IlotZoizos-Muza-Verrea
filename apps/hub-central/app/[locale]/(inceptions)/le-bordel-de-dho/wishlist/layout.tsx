// apps/hub-central/app/[locale]/(inceptions)/wishlist/layout.tsx
import React from 'react';

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-200 selection:bg-[#E5484D]/30">
      {children}
    </div>
  );
}