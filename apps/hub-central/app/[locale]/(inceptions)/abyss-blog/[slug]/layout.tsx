// apps/hub-central/app/[locale]/(inceptions)/abyss-blog/[slug]/layout.tsx
'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
      {/* Aura Bio-Tech */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[#E5484D]/5 to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <main>{children}</main>
      </div>
    </div>
  );
}