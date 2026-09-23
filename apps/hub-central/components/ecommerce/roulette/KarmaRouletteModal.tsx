'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';

interface KarmaRouletteModalProps {
  productUid: string;
  productTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export function KarmaRouletteModal({ productUid, productTitle, isOpen, onClose, onSuccess }: KarmaRouletteModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ sessionUid: string; priceCents: number; expiresAt: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!result?.expiresAt) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(result.expiresAt).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setTimeLeft('Expiré');
        clearInterval(interval);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [result]);

  if (!isOpen) return null;

  const handleSpin = async () => {
    setIsSpinning(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/ecommerce/roulette/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUid }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec du tour de roue karmique.");
      }

      setResult(data.data);
      if (onSuccess) onSuccess(data.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Une erreur est survenue.");
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-black/90 border border-white/10 rounded-3xl p-6 space-y-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-cyan-400">
            <Sparkles size={16} /> La Roue Karmique
          </h2>
          <button onClick={onClose} className="text-xs font-mono text-slate-500 hover:text-white uppercase">[ Fermer ]</button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-slate-400 font-mono">Artefact : <span className="text-white font-bold">{productTitle}</span></p>
          
          {/* Roue visuelle dynamique */}
          <div className="relative w-40 h-40 mx-auto my-6 flex items-center justify-center rounded-full border-4 border-cyan-500/30 bg-cyan-500/5">
            <div className={`w-32 h-32 rounded-full border-2 border-dashed border-cyan-400 flex items-center justify-center transition-transform duration-1000 ${isSpinning ? 'animate-spin' : ''}`}>
              <Sparkles size={32} className="text-cyan-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Avertissement réglementaire de l'Îlot */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-300 text-xs font-mono">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Sans achat sous 24h, la mise financera le vendeur et l'Îlot.</span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-mono">
            ⚠️ {errorMessage}
          </div>
        )}

        {result ? (
          <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10 text-center font-mono">
            <p className="text-xs text-slate-400 uppercase">Prix Secret Karmique Obtenu</p>
            <p className="text-2xl font-black text-cyan-300">{(result.priceCents / 100).toFixed(2)} €</p>
            <div className="text-xs text-slate-400">
                Verrouillé pendant : <span className="text-white font-bold">{timeLeft || 'Calcul...'}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 font-black uppercase text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isSpinning ? (
              <>
                <Loader2 size={16} className="animate-spin" /> La roue tourne...
              </>
            ) : (
              'Faire tourner la Roue'
            )}
          </button>
        )}
      </div>
    </div>
  );
}