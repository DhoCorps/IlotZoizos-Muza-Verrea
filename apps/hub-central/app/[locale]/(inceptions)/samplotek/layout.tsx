import React from 'react';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'SamploTek • Studio E-Jay de l’Îlot Zoizos',
  description: 'Studio de composition multipiste, banque de sons et économie circulaire souveraine.',
};

export default function SamploTekLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Notifications globales de la Canopée */}
      <Toaster position="bottom-right" theme="dark" richColors />
      
      {/* Contenu principal de l'application SamploTek */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}