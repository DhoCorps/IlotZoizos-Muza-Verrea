"use client";

import { useState } from 'react';
import { useResonance } from '../../hooks/useResonance';
import { ResonanceType } from '@ilot/types';
import { Bell, BellOff, EyeOff, Loader2 } from 'lucide-react';

interface ResonanceButtonProps {
  targetSlug: string;
  initialIsFollowing?: boolean;
  type?: ResonanceType;
  entityId?: string;
  variant?: 'default' | 'icon'; // 🟢 LA CORRECTION EST ICI
}

export default function ResonanceButton({ 
  targetSlug, 
  initialIsFollowing = false, 
  type = 'FOLLOWS_GLOBAL',
  entityId,
  variant = 'default'
}: ResonanceButtonProps) {
  
  const { toggleLink, isLoading } = useResonance(targetSlug);
  
  // Optimistic UI : On met à jour l'UI instantanément
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Évite les soucis si le bouton est dans un Link
    const action = isFollowing ? 'SEVER' : 'WEAVE';
    setIsFollowing(!isFollowing);

    const result = await toggleLink(action, type, entityId);

    // Rollback si la base de données a rejeté la demande
    if (!result?.success) {
      setIsFollowing(isFollowing);
    } else if (result.isHarmonic) {
      console.log("✨ Harmonie établie !");
    }
  };

  // -----------------------------------------------------
  // RENDU VERSION ICONE (Pour les grilles et petites cartes)
  // -----------------------------------------------------
  if (variant === 'icon') {
    return (
      <button 
        onClick={handleToggle}
        disabled={isLoading}
        className={`p-2.5 rounded-xl border transition-all ${
          isFollowing 
            ? 'bg-transparent border-slate-500/50 text-slate-400 hover:text-white' 
            : 'bg-[#E5484D]/10 hover:bg-[#E5484D]/20 border-[#E5484D]/30 text-[#E5484D]'
        }`}
        title={isFollowing ? "Ne plus suivre" : "S'abonner"}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isFollowing ? (
          <BellOff size={14} />
        ) : (
          <Bell size={14} />
        )}
      </button>
    );
  }

  // -----------------------------------------------------
  // RENDU VERSION CLASSIQUE (Pour les pages profils)
  // -----------------------------------------------------
  const buttonText = type === 'FOLLOWS_GLOBAL' 
    ? (isFollowing ? 'Ne plus suivre' : 'Suivre l\'Oiseau')
    : type === 'FOLLOWS_SPECIFIC'
    ? (isFollowing ? 'Abonné au projet' : 'Suivre ce projet')
    : (isFollowing ? 'Réafficher' : 'Éclipser ce projet');

  return (
    <button 
      onClick={handleToggle}
      disabled={isLoading}
      className={`px-4 py-2 flex items-center justify-center gap-2 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${
        isFollowing 
          ? 'bg-transparent border border-slate-500 text-slate-400 hover:text-slate-200 hover:border-slate-400' 
          : 'bg-[#E5484D] text-white hover:bg-[#c43d41] shadow-[0_0_15px_rgba(229,72,77,0.3)]'
      }`}
    >
      {isLoading && <Loader2 size={14} className="animate-spin" />}
      {!isLoading && (isFollowing ? <BellOff size={14} /> : <Bell size={14} />)}
      {buttonText}
    </button>
  );
}