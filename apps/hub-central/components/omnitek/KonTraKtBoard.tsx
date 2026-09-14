"use client";

import React, { useEffect, useState } from 'react';
import { IKonTraKt } from '@ilot/types';

export const KonTraKtBoard = ({ currentUserUid }: { currentUserUid: string }) => {
  const [contracts, setContracts] = useState<IKonTraKt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔄 Récupération dynamique des contrats depuis notre route API GET /api/economy/kontrakt
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await fetch('/api/economy/kontrakt');
        if (!res.ok) {
          throw new Error("L'onde du marché a échoué.");
        }
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setContracts(json.data);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Erreur de lecture du marché :", error);
        setIsLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const handleAcceptContract = async (contractId: string) => {
    // Logique pour couvrir la mise (appel API vers /api/economy/kontrakt/accept ou similaire)
    console.log(`Tentative de couverture du contrat ${contractId}`);
  };

  if (isLoading) {
    return <div className="text-slate-400 animate-pulse">Synchronisation avec la Bourse de la Canopée...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      {/* En-tête du Terminal */}
      <div className="bg-slate-800 border-b border-red-900/50 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-200 uppercase tracking-widest">
          <span className="text-red-500 mr-2">♦</span> Marché des KonTraKts
        </h2>
        <span className="text-xs text-slate-400 font-mono">Taux fixés sous séquestre</span>
      </div>

      {/* Grille des contrats */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts.length === 0 ? (
          <div className="col-span-full text-center text-slate-500 py-8 italic">
            Aucun défi en attente. Le marché est calme.
          </div>
        ) : (
          contracts.map((contract) => {
            const isMine = contract.creatorId === currentUserUid;

            return (
              <div 
                key={contract._id?.toString()} 
                className={`flex flex-col justify-between p-4 rounded-lg border transition-all duration-300 ${
                  isMine 
                    ? 'bg-slate-800/50 border-slate-700 opacity-70' 
                    : 'bg-slate-800 border-red-900/30 hover:border-red-700/80 hover:shadow-[0_0_15px_rgba(153,27,27,0.3)]'
                }`}
              >
                {/* Détails du contrat */}
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded">
                      {contract.gameId.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      Niv. <span className="text-slate-200">{contract.difficulty}</span>
                    </span>
                  </div>
                  
                  <div className="text-slate-400 text-sm mt-3">
                    Valeur cristallisée :
                    <div className="text-2xl font-mono text-slate-100 mt-1">
                      {contract.targetDhOValue.toFixed(2)} <span className="text-red-400 text-lg">DhÔ</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto">
                  {isMine ? (
                    <button disabled className="w-full py-2 bg-slate-950 text-slate-500 text-sm font-semibold rounded cursor-not-allowed">
                      Votre KonTraKt (En attente)
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAcceptContract(contract._id?.toString() || '')}
                      className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 text-red-100 border border-red-900/50 hover:border-red-500 transition-colors text-sm font-semibold rounded"
                    >
                      Couvrir la mise
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};