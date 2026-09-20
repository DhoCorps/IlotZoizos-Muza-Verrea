import React, { useEffect, useState } from 'react';

export interface KosmicJackpotAnimationProps {
  isJackpot: boolean;
  onComplete?: () => void;
  durationMs?: number;
}

export const KosmicJackpotAnimation: React.FC<KosmicJackpotAnimationProps> = ({
  isJackpot,
  onComplete,
  durationMs = 4000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isJackpot) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, durationMs);

      return () => clearTimeout(timer);
    }
  }, [isJackpot, durationMs, onComplete]);

  if (!isVisible) return null;

  // Génération de plumes ou d'étincelles aléatoires pour la pluie dorée
  const particles = Array.from({ length: 20 });

  return (
    <div 
      className="absolute inset-0 z-50 overflow-hidden pointer-events-none flex items-center justify-center bg-gradient-to-r from-amber-500/90 via-purple-600/90 to-amber-600/90 backdrop-blur-md animate-pulse"
      role="region"
      aria-label="Animation de la Faveur du Kosmos"
    >
      {/* Pluie d'étoiles / plumes dorées */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((_, i) => {
          // Positions et délais aléatoires pour un effet organique de chute
          const leftPos = `${(i * 5) % 100}%`;
          const animationDuration = `${2 + (i % 3)}s`;
          const animationDelay = `${(i * 0.15).toFixed(2)}s`;

          return (
            <span
              key={i}
              className="absolute text-xl select-none animate-bounce"
              style={{
                left: leftPos,
                top: '-10px',
                animationDuration,
                animationDelay,
              }}
            >
              {i % 2 === 0 ? '✨' : '🪶'}
            </span>
          );
        })}
      </div>

      {/* Message central du Jackpot */}
      <div className="relative z-10 text-center px-4 space-y-2 animate-bounce">
        <h3 className="text-2xl font-extrabold text-white tracking-wider drop-shadow-md">
          🌟 FAVEUR DU KOSMOS ! 🌟
        </h3>
        <p className="text-sm font-medium text-amber-100 drop-shadow">
          Votre écho s'est sédimenté dans les étoiles. Le prochain palier du Gacha s'illumine.
        </p>
      </div>
    </div>
  );
};