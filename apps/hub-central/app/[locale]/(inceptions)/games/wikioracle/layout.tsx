// apps/hub-central/app/[locale]/games/wikioracle/layout.tsx
import React from 'react';

export default function WikiOracleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-8 px-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-5xl">
        {children}
      </div>
    </div>
  );
}