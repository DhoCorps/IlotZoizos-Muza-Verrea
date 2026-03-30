import React from 'react';
// 🌟 ON IMPORTE LE GÉNÉRATEUR (le pont qu'on a créé ensemble)
import { AuthProvider } from '../../AuthProvider'; 

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🛰️ On enveloppe TOUT le contenu dans le AuthProvider
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* On peut ajouter un petit logo ou un retour à l'accueil ici */}
        <div className="z-10 w-full max-w-4xl">
          {children}
        </div>
        
        {/* Effet de halo lumineux en arrière-plan pour le style Nexus */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -z-0" />
      </div>
    </AuthProvider>
  );
}