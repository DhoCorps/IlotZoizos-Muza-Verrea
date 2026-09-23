'use client';

import React, { useState, useEffect } from 'react';

interface RaffleMonolithProps {
  raffle: {
    uid: string;
    prizeProductUid: string;
    prizeTitle?: string;
    vendorName?: string;
    ticketPriceShards: number;
    maxTickets?: number;
    soldTicketsCount?: number;
    drawDate: string | Date;
  };
  onBuyTicket?: (raffleUid: string) => Promise<void>;
  isLoading?: boolean;
}

export function RaffleMonolith({ raffle, onBuyTicket, isLoading = false }: RaffleMonolithProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isEnded, setIsEnded] = useState(false);

  // ⏳ Calcul ultra-précis du Compte à Rebours (FOMO)
  useEffect(() => {
    const targetTime = new Date(raffle.drawDate).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setIsEnded(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [raffle.drawDate]);

  const soldCount = raffle.soldTicketsCount || 0;
  const maxLimit = raffle.maxTickets;
  const hasLimit = typeof maxLimit === 'number' && maxLimit > 0;
  const progressPercent = hasLimit ? Math.min(100, Math.round((soldCount / maxLimit) * 100)) : 0;

  return (
    <div className="relative border-2 border-amber-800/80 bg-neutral-950 p-6 text-amber-100 shadow-2xl backdrop-blur-md">
      <div className="absolute -top-3 right-4 bg-amber-950 px-3 py-0.5 text-xs uppercase tracking-widest text-amber-400 border border-amber-700">
        ✨ Monolithe de Loterie
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-bold tracking-wider text-amber-200">
          {raffle.prizeTitle || `Artéfact : ${raffle.prizeProductUid}`}
        </h3>
        <p className="text-xs text-amber-500 uppercase tracking-widest mt-1">
          Souveraineté : {raffle.vendorName || 'Anonyme de la Canopée'}
        </p>
      </div>

      {/* ⏳ COMPTE À REBOURS ULTRA-PRÉCIS */}
      <div className="my-6 border border-amber-900/50 bg-black/60 p-4 text-center">
        <div className="text-[10px] uppercase tracking-widest text-amber-500 mb-2">
          {isEnded ? "Stase close — Tirage imminent" : "Fermeture du Sceau dans :"}
        </div>
        <div className="grid grid-cols-4 gap-2 text-amber-300 font-mono font-bold text-lg">
          <div className="bg-neutral-900 p-2 border border-amber-950">
            <div>{String(timeLeft.days).padStart(2, '0')}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Jours</div>
          </div>
          <div className="bg-neutral-900 p-2 border border-amber-950">
            <div>{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Heures</div>
          </div>
          <div className="bg-neutral-900 p-2 border border-amber-950">
            <div>{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Mins</div>
          </div>
          <div className="bg-neutral-900 p-2 border border-amber-950 text-amber-500">
            <div>{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="text-[9px] text-neutral-500 uppercase">Secs</div>
          </div>
        </div>
      </div>

      {/* 📊 BARRE DE PROGRESSION FOMO (Si limité) */}
      {hasLimit && (
        <div className="mb-6 space-y-1.5">
          <div className="flex justify-between text-xs tracking-wide">
            <span className="text-amber-300 font-medium">
              {soldCount} / {maxLimit} tickets vendus
            </span>
            <span className="text-amber-500 font-bold uppercase tracking-wider">
              {progressPercent >= 80 ? "⚠️ Dépêchez-vous !" : `${progressPercent}% scellé`}
            </span>
          </div>
          <div className="h-2 w-full bg-neutral-900 border border-amber-950 overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-amber-900/40 pt-4">
        <div>
          <span className="text-[10px] uppercase text-neutral-400 block">Valeur du Ticket</span>
          <span className="text-lg font-bold text-amber-400">{raffle.ticketPriceShards} Éclats</span>
        </div>

        {onBuyTicket && (
          <button
            type="button"
            disabled={isLoading || isEnded}
            onClick={() => onBuyTicket(raffle.uid)}
            className="bg-amber-700 px-6 py-2.5 font-bold uppercase tracking-widest text-black transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {isEnded ? "Stase Close" : isLoading ? "Acquisition..." : "Acquérir un Ticket"}
          </button>
        )}
      </div>
    </div>
  );
}