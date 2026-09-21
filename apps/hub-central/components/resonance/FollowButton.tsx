'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

interface FollowButtonProps {
  targetUid: string;
  targetType: 'USER' | 'BLOG' | 'PROJECT' | 'GAME' | 'FONT' | 'SPRITE' | 'LYRIKA' | 'SAMPLOTEK' | 'BIBLIOTEK' | 'POETRIK';
  initialIsFollowing?: boolean;
  onToggle?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetUid,
  targetType,
  initialIsFollowing = false,
  onToggle,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFollow = async () => {
    setIsLoading(true);
    try {
      const action = isFollowing ? 'UNFOLLOW' : 'FOLLOW';
      const res = await fetch('/api/resonance/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid, targetType, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de la modification de l'abonnement.");
      }

      const newFollowingState = !isFollowing;
      setIsFollowing(newFollowingState);
      if (onToggle) {
        onToggle(newFollowingState);
      }

      toast.success(data.message || (newFollowingState ? "Lien tissé avec succès." : "Lien rompu."));
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Follow button error:", error);
      toast.error(`Ineptie technique : ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isLoading}
      aria-label={isFollowing ? "Se désabonner" : "S'abonner"}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
        isFollowing
          ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
      } disabled:opacity-50`}
    >
      {isLoading ? 'Propagation...' : isFollowing ? '✓ Suivi' : "+ S'abonner"}
    </button>
  );
}