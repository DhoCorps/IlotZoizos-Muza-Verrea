'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Les monnaies de l'Îlot
const CURRENCIES = ['parchemins', 'plumes', 'vinyles', 'totamtoes'];

interface Identity {
  pseudo: string;
  frequenceHEX: string;
}

export default function OnboardingModal({ userUid }: { userUid: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Génération du coût aléatoire pour le "re-roll"
  const [rerollCost, setRerollCost] = useState({
    amount: Math.floor(Math.random() * 3) + 1, // Coût entre 1 et 3
    currency: CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)]
  });

  // Appel initial pour vérifier si l'oiseau doit être éveillé
  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const res = await fetch('/api/oiseau/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userUid })
        });
        const data = await res.json();
        
        if (data.success && data.message.includes("attribuée avec succès")) {
          setIdentity(data.data);
          setIsOpen(true); // Ouvre la modale uniquement si c'est une nouvelle identité
        }
      } catch (error) {
        console.error("Erreur lors de l'éveil :", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIdentity();
  }, [userUid]);

  const handleAccept = () => {
    setIsOpen(false);
    router.refresh(); // Rafraîchit la Canopée pour afficher le nouveau pseudo partout
  };

  const handleReroll = async () => {
    setIsLoading(true);
    try {
      // Appel vers une future route qui déduit le coût et regénère une identité
      const res = await fetch('/api/oiseau/onboarding/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUid, cost: rerollCost })
      });
      const data = await res.json();
      
      if (data.success) {
        setIdentity(data.data);
        // On génère un nouveau coût pour le prochain reroll potentiel
        setRerollCost({
          amount: Math.floor(Math.random() * 3) + 1,
          currency: CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)]
        });
      } else {
        alert(data.message || "Fonds insuffisants dans l'Alvéole !");
      }
    } catch (error) {
      console.error("Erreur lors de la mutation :", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !identity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm transition-opacity duration-500">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center transform transition-all scale-100 opacity-100">
        
        <h2 className="text-2xl font-bold text-slate-200 mb-2">
          L'Éveil de l'Oiseau
        </h2>
        <p className="text-slate-400 mb-8 text-sm">
          La Matrice a sondé ta résonance. Voici ton identité au sein de l'Îlot :
        </p>

        <div className="py-6 px-4 bg-slate-900/50 rounded-xl border border-slate-700 mb-8">
          <p 
            className="text-3xl font-extrabold tracking-wide"
            style={{ color: identity.frequenceHEX }}
          >
            {identity.pseudo}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono uppercase">
            Fréquence : {identity.frequenceHEX}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            Accepter cette Révélation
          </button>
          
          <button
            onClick={handleReroll}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-transparent border border-red-600 text-red-500 hover:bg-red-900/30 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-pulse">Consultation de la Silice...</span>
            ) : (
              <>
                Hériter d'un autre Sobriquet
                <span className="text-xs px-2 py-1 bg-red-950/50 rounded text-red-300">
                  -{rerollCost.amount} {rerollCost.currency}
                </span>
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}