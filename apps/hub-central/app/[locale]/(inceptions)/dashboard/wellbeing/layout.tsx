// apps/hub-central/app/[locale]/(inceptions)/dashboard/wellbeing/layout.tsx
import React from 'react';

export default function WellbeingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 flex flex-col items-center selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {children}
      </div>
    </div>
  );
}