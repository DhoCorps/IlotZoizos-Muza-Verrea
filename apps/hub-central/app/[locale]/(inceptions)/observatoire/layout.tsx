// apps/hub-central/app/[locale]/observatoire/layout.tsx
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Observatoire des Fréquences | Îlot Zoizos',
    description: 'Sanctuaire métaphysique et lecture vibratoire de la volière.',
};

export default function ObservatoireLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="observatoire-sanctuary w-full min-h-screen bg-[#11161d] text-slate-100 selection:bg-[#3a4654] selection:text-slate-100">
            {children}
        </div>
    );
}