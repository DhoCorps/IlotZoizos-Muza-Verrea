"use client";

import React, { useState } from 'react';

export interface BasketItem {
  currency: 'plumes' | 'totamtoes' | 'parchemins' | 'vinyles' | 'sampleNotes';
  quantity: number;
  unitDhOValue: number;
}

interface VictoryBasketBuilderProps {
  kontraktId: string;
  earnedCreditDhO: number; // Le crédit calculé par l'Orchestrateur (ex: 5.0 DhÔ)
  onResolveSuccess: (resultData: any) => void;
}

// Catalogue des ressources disponibles dans la Canopée avec leur valeur unitaire en DhÔ
const AVAILABLE_RESOURCES = [
  { currency: 'plumes', label: 'Plumes', unitDhOValue: 1.0, icon: '🪶' },
  { currency: 'totamtoes', label: 'Totamtoes', unitDhOValue: 1.5, icon: '🍅' },
  { currency: 'parchemins', label: 'Parchemins', unitDhOValue: 2.0, icon: '📜' },
  { currency: 'vinyles', label: 'Vinyles', unitDhOValue: 3.5, icon: '💿' },
  { currency: 'sampleNotes', label: 'Sample Notes', unitDhOValue: 5.0, icon: '🎵' },
];

export const VictoryBasketBuilder: React.FC<VictoryBasketBuilderProps> = ({
  kontraktId,
  earnedCreditDhO,
  onResolveSuccess,
}) => {
  // État des quantités choisies pour chaque ressource
  const [quantities, setQuantities] = useState<Record<string, number>>({
    plumes: 0,
    totamtoes: 0,
    parchemins: 0,
    vinyles: 0,
    sampleNotes: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gestion de la modification des quantités
  const handleQuantityChange = (currency: string, delta: number) => {
    setErrorMessage(null);
    setQuantities((prev) => {
      const current = prev[currency] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [currency]: next };
    });
  };

  // Calcul dynamique du coût total du panier
  const totalBasketCost = AVAILABLE_RESOURCES.reduce((sum, res) => {
    return sum + (quantities[res.currency] || 0) * res.unitDhOValue;
  }, 0);

  // Le reliquat non dépensé qui sera brûlé pour protéger l'économie
  const burnedFraction = Math.max(0, Math.floor((earnedCreditDhO - totalBasketCost) * 100) / 100);
  const isOverBudget = totalBasketCost > earnedCreditDhO;

  // Validation et envoi du Panier vers la route de résolution
  const handleSubmitBasket = async () => {
    if (isOverBudget) {
      setErrorMessage("Le coût total dépasse votre crédit de victoire acquis !");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Transformation du dictionnaire en tableau propre pour l'API
    const victoryBasket: BasketItem[] = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([currency, quantity]) => {
        const resMeta = AVAILABLE_RESOURCES.find((r) => r.currency === currency);
        return {
          currency: currency as any,
          quantity,
          unitDhOValue: resMeta ? resMeta.unitDhOValue : 1.0,
        };
      });

    try {
      const response = await fetch('/api/economy/kontrakt/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kontraktId,
          isWinner: true,
          victoryBasket,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Échec de la livraison du panier.");
      }

      onResolveSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la communication avec la matrice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100">
      {/* En-tête */}
      <div className="flex justify-between items-center border-b border-red-900/40 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-200">
            <span className="text-red-500 mr-2">♦</span> Panier de Victoire
          </h2>
          <p className="text-xs text-slate-400 mt-1">Composez votre butin en respectant votre crédit acquis.</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block font-mono">CRÉDIT DISPONIBLE</span>
          <span className="text-2xl font-mono text-red-400 font-bold">{earnedCreditDhO.toFixed(2)} DhÔ</span>
        </div>
      </div>

      {/* Erreur éventuelle */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-lg">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Liste des ressources sélectionnables */}
      <div className="space-y-3 mb-6">
        {AVAILABLE_RESOURCES.map((res) => {
          const qty = quantities[res.currency] || 0;
          const itemCost = qty * res.unitDhOValue;

          return (
            <div 
              key={res.currency} 
              className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 p-3 rounded-lg hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{res.icon}</span>
                <div>
                  <span className="font-medium text-slate-200">{res.label}</span>
                  <span className="text-xs text-slate-400 block font-mono">{res.unitDhOValue} DhÔ / unité</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm font-mono text-slate-300 w-16 text-right">
                  {itemCost.toFixed(1)} DhÔ
                </span>
                
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 rounded px-2 py-1">
                  <button
                    onClick={() => handleQuantityChange(res.currency, -1)}
                    disabled={qty === 0}
                    className="text-slate-400 hover:text-white disabled:opacity-30 px-1 font-bold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono text-slate-100">{qty}</span>
                  <button
                    onClick={() => handleQuantityChange(res.currency, 1)}
                    className="text-slate-400 hover:text-white px-1 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthèse financière et Déflation */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg mb-6 space-y-2 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Coût total du panier :</span>
          <span className={`font-mono font-bold ${isOverBudget ? 'text-red-500' : 'text-slate-100'}`}>
            {totalBasketCost.toFixed(2)} DhÔ
          </span>
        </div>
        <div className="flex justify-between text-slate-400 text-xs">
          <span>Fraction non dépensée (Brûlée pour l'équilibre) :</span>
          <span className="font-mono text-red-400">{burnedFraction.toFixed(2)} DhÔ</span>
        </div>
      </div>

      {/* Bouton de validation */}
      <button
        onClick={handleSubmitBasket}
        disabled={isSubmitting || isOverBudget || totalBasketCost === 0}
        className={`w-full py-3 rounded-lg font-semibold tracking-wider transition-all shadow-lg ${
          isOverBudget || totalBasketCost === 0
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-red-900/40 hover:bg-red-900/60 text-red-100 border border-red-700 hover:border-red-500 shadow-[0_0_15px_rgba(153,27,27,0.3)]'
        }`}
      >
        {isSubmitting ? 'Cristallisation en cours...' : 'Valider le Panier et Récolter'}
      </button>
    </div>
  );
};