// apps/hub-central/app/[locale]/agora/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Lock, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { OmniShowcasePlayer } from '@/components/showcase/OmniShowcasePlayer';

export default function AgoraPage() {
  const { data: session, status } = useSession();
  const [isAccessible, setIsAccessible] = useState<boolean>(false);
  const [isCheckingTime, setIsCheckingTime] = useState<boolean>(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      
      // 🌍 Synchronisation exacte avec le fuseau horaire du Middleware (Paris)
      const parisHourStr = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Paris', 
        hour: 'numeric', 
        hour12: false 
      }).format(now);
      
      const currentHour = parseInt(parisHourStr, 10);
      
      // 🌙 La fenêtre d'ouverture : 00:00 (inclus) à 05:59 (inclus)
      const isOpen = currentHour >= 0 && currentHour < 6;
      setIsAccessible(isOpen);

      // Calcul du temps restant avant le prochain minuit (Heure de Paris)
      if (!isOpen) {
        // Obtenir la date actuelle à Paris
        const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
        const midnight = new Date(parisNow);
        midnight.setHours(24, 0, 0, 0); // Prochain minuit
        
        const diff = midnight.getTime() - parisNow.getTime();
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${h}h et ${m}m`);
      }

      setIsCheckingTime(false);
    };

    checkTime();
    // Re-vérification toutes les minutes
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // On attend que l'heure SOIT vérifiée ET que la session soit chargée
  const isChecking = isCheckingTime || status === 'loading';

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center">
        <Moon className="w-10 h-10 animate-pulse text-slate-700" />
      </div>
    );
  }

  // 🔒 FERMÉ : Écran de stase (Journée) - Si un Oiseau force l'URL hors des heures nocturnes
  if (!isAccessible) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center p-4 relative overflow-hidden animate-in fade-in duration-700">
        {/* Effets atmosphériques diurnes tamisés */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 text-center space-y-8 max-w-md mx-auto p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <Sun className="w-8 h-8 text-slate-500" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-2xl font-black uppercase tracking-widest text-slate-200 flex items-center justify-center gap-2">
              <Lock size={18} className="text-[#E5484D]" /> L'Agora Repose
            </h1>
            <p className="text-sm text-slate-400 font-mono leading-relaxed">
              Le flux continu des créations de l'Îlot ne s'éveille qu'au crépuscule. La matrice compile actuellement les rêves des oiseaux.
            </p>
          </div>

          <div className="pt-6 border-t border-white/5">
            <p className="text-xs uppercase font-bold tracking-widest text-amber-500/70">
              Ouverture dans {timeRemaining}
            </p>
            <p className="text-[10px] text-slate-600 mt-2 font-mono">
              [ 00:00 - 06:00 ]
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Identification sécurisée de l'Oiseau
  const userUid = session?.user?.uid || (session?.user as any)?.id;

  if (!userUid) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center text-slate-400 font-mono text-sm space-y-4">
        <Lock className="w-8 h-8 text-[#E5484D]" />
        <p>Aura non détectée. L'accès à l'Agora nécessite une identification.</p>
      </div>
    );
  }

  // 🌌 OUVERT : Le Diaporama Universel (Nuit)
  return (
    <div className="min-h-screen bg-black text-white relative animate-in fade-in duration-1000">
      
      {/* Composant Maître du Diaporama */}
      <OmniShowcasePlayer userUid={userUid} />
      
      {/* Indicateur discret confirmant que le refuge est actif, en pointant vers l'esthétique rouge/slate */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-3 py-1.5 bg-black/50 border border-white/10 rounded-full backdrop-blur-md shadow-lg pointer-events-none">
        <Sparkles size={12} className="text-[#E5484D] animate-pulse" />
        <span className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">
          Refuge Nocturne Actif
        </span>
      </div>
    </div>
  );
}