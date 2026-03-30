'use client';

import React, { ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Toaster } from 'sonner';

// 💠 Imports Locaux (Le Corps - Next.js)
// Assure-toi que ces fichiers existent bien dans apps/hub-central/context/ ou components/
import { AuthProvider, useAuth } from '../../context/AuthContext'; 
import { VibeProvider, useVibe } from '../../context/VibeContext';
import { WebSocketProvider } from '../../context/WebSocketContext';
import { AuthButton } from '../ui/AuthButton'; 
import { LangSwitcher } from '../ui/LangSwitcher';

// 🛡️ Types et Identités (L'ADN partagé)
// Maintenant que packages/types/src/index.ts existe, ceci fonctionnera !
import { ROLE_BADGES, CAPABILITIES, UserRole } from '@ilot/types';
/**
 * 🎨 CONFIGURATION DES VIBES
 */
const VIBE_MAP: Record<string, string> = {
  stable: "bg-slate-950 text-emerald-50/90 shadow-[inset_0_0_100px_rgba(16,185,129,0.05)]",
  vibrant: "bg-indigo-950 text-cyan-50 shadow-[inset_0_0_120px_rgba(6,182,212,0.1)]",
  pulse: "bg-zinc-950 text-amber-50 shadow-[inset_0_0_80px_rgba(245,158,11,0.1)]",
  storm: "bg-red-950 text-red-50 animate-pulse"
};

interface ManifesteProps {
  children: ReactNode;
}

export default function Manifeste({ children }: ManifesteProps) {
  return (
    <AuthProvider>
      <VibeProvider>
        <WebSocketProvider>
          <LayoutInterieur>{children}</LayoutInterieur>
          <Toaster position="bottom-right" theme="dark" />
        </WebSocketProvider>
      </VibeProvider>
    </AuthProvider>
  );
}

function LayoutInterieur({ children }: { children: ReactNode }) {
  const { mode } = useVibe();
  const { user } = useAuth();
  const t = useTranslations('nav');

  // Déduction du rôle et du badge
  const userRole = (user?.role?.toUpperCase() as UserRole) || 'GUEST';
  const currentBadge = ROLE_BADGES[userRole];
  
  // Signature dynamique : <(:< pour l'Architecte, >:)> pour les autres
  const isArchitect = userRole === 'ARCHITECTE';
  const signature = isArchitect ? '<(:<' : '>:)>';

  const containerStyle = useMemo(() => 
    `min-h-screen transition-all duration-[2000ms] ease-in-out relative overflow-hidden ${VIBE_MAP[mode] || VIBE_MAP.stable}`,
    [mode]
  );

  return (
    <div className={containerStyle}>
      {/* Texture de grain */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* 🧭 NAVIGATION */}
      <nav className="p-6 border-b border-white/5 flex justify-between items-center backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <div className="font-mono tracking-tighter text-xl flex items-center gap-2">
            <span className={mode === 'stable' ? 'text-emerald-500' : 'text-cyan-400'}>💠</span>
            {t('title')}
            <span className="text-[10px] opacity-30 px-2 py-0.5 border border-current rounded-full ml-2">
              {t('subtitle')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentBadge && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-bold tracking-widest transition-all duration-500 ${currentBadge.color}`}>
              <span>{currentBadge.icon}</span>
              <span className="hidden md:inline uppercase">{currentBadge.label}</span>
            </div>
          )}

          {user?.capabilities?.includes(CAPABILITIES.FILE.BURN) && (
            <button className="p-2 text-red-400 hover:text-red-200 hover:scale-125 transition-all" title="NUCLEUS:BURN">
              🔥
            </button>
          )}

          <div className="h-6 w-[1px] bg-current opacity-10 mx-1" />
          <LangSwitcher />
          <AuthButton />
        </div>
      </nav>

      {/* 🌌 CONTENU PRINCIPAL */}
      <main className="relative min-h-[calc(100vh-180px)] z-10">
        {children}
      </main>

      {/* 🖋️ FOOTER : IDENTITÉ & SYSTÈME */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 flex justify-between items-end pointer-events-none z-40">
        <div className="pointer-events-auto group">
          <div className="bg-black/20 backdrop-blur-2xl p-5 rounded-tr-3xl border-t border-r border-white/10 transition-all hover:bg-black/40 shadow-2xl">
            <p className="text-[9px] uppercase tracking-[0.2em] mb-3 opacity-30">
              {isArchitect ? "Master Control" : "Session Identity"}
            </p>
            <div className="flex items-center gap-4">
              <span 
                className={`text-3xl transition-all duration-700 cursor-help ${isArchitect ? 'grayscale-0' : 'grayscale'}`} 
                title={user?.name || "DhÖ"}
              >
                {signature}
              </span>
              <div className="h-8 w-[1px] bg-white/10" />
              <div className="text-[10px] italic opacity-50 max-w-[200px] leading-tight group-hover:opacity-100 transition-opacity">
                "{t('motto')}"
              </div>
            </div>
          </div>
        </div>

        <div className="text-right opacity-20 text-[8px] uppercase tracking-[0.4em] leading-loose">
          Role_ID : {userRole} <br />
          Vibe : {mode.toUpperCase()} <br />
          Integrity : 100%
        </div>
      </footer>
    </div>
  );
}