'use client';

import React, { useState, useEffect } from 'react';

interface RaffleDrawAnimationProps {
  winnerPseudo: string;
  onRevealComplete?: () => void;
}

export function RaffleDrawAnimation({ winnerPseudo, onRevealComplete }: RaffleDrawAnimationProps) {
  const [displayText, setDisplayText] = useState('DÉCRYPTAGE MATRICIEL EN COURS...');
  const [isRevealed, setIsRevealed] = useState(false);

  const matrixChars = '01<(:<>:)#@§*%&';

  useEffect(() => {
    let iteration = 0;
    const maxIterations = 25;

    const interval = setInterval(() => {
      setDisplayText(
        winnerPseudo
          .split('')
          .map((_, index) => {
            if (index < Math.floor(iteration / (maxIterations / winnerPseudo.length))) {
              return winnerPseudo[index];
            }
            return matrixChars[Math.floor(Math.random() * matrixChars.length)];
          })
          .join('')
      );

      iteration++;

      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(winnerPseudo);
        setIsRevealed(true);
        if (onRevealComplete) {
          onRevealComplete();
        }
      }
    }, 80);

    return () => clearInterval(interval);
  }, [winnerPseudo, onRevealComplete]);

  return (
    <div className="relative border-2 border-amber-600 bg-black p-8 text-center text-amber-200 shadow-2xl backdrop-blur-md">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-950 px-3 py-0.5 text-xs uppercase tracking-widest text-amber-400 border border-amber-600">
        ⚡ Le Vortex de la Destinée ⚡
      </div>

      <div className="my-6">
        <div className="text-xs uppercase tracking-widest text-amber-500 mb-3">
          {isRevealed ? "Destin scellé — Le Vainqueur de la Canopée :" : "Auscultation du Hasard Souverain..."}
        </div>
        <div className="font-mono text-3xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          {displayText}
        </div>
      </div>

      {isRevealed && (
        <div className="mt-4 animate-pulse text-xs uppercase tracking-wider text-emerald-400">
          ✨ Le karma a parlé. Gloire à l&apos;Oiseau élu. ✨
        </div>
      )}
    </div>
  );
}