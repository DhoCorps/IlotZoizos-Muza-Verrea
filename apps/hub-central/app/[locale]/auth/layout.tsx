import React from 'react';
// 🌟 ON IMPORTE LE GÉNÉRATEUR (le pont qu'on a créé ensemble)
import { AuthProvider } from '../../AuthProvider'; 
import { VibeProvider } from "../../../context/VibeContext"; // Ajuste le chemin selon ton projet

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <VibeProvider> 
      <AuthProvider>
        <div className="min-h-screen bg-[#05070A] flex items-center justify-center relative overflow-hidden">
          {children}
          {/* Ton halo rouge... */}
        </div>
      </AuthProvider>
    </VibeProvider>
  );
}