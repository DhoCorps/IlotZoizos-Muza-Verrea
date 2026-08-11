// apps/hub-central/components/global/GlobalBarterDrawer.tsx
'use client';

import React, { useState } from 'react';
import { IAssetValue, AssetType } from '@ilot/types';

interface GlobalBarterDrawerProps {
  currentGameId?: string;
  userTasks?: { uid: string; title: string }[];
}

export const GlobalBarterDrawer: React.FC<GlobalBarterDrawerProps> = ({ 
  currentGameId = 'global-canopy', 
  userTasks = [] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskUid, setSelectedTaskUid] = useState<string>(userTasks[0]?.uid || '');
  const [targetKaos, setTargetKaos] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceBet = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const bets: IAssetValue[] = selectedTaskUid 
        ? [{ type: 'TASK' as AssetType, amount: 1, entityId: selectedTaskUid }]
        : [{ type: 'KAOS' as AssetType, amount: 10 }];

      const targets: IAssetValue[] = [
        { type: 'KAOS' as AssetType, amount: Number(targetKaos) }
      ];

      const res = await fetch('/api/games/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: currentGameId, bets, targets })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du placement du pari.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton Flottant d'accès rapide au Barter */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 border border-indigo-400"
        title="Ouvrir le Comptoir de Barter"
      >
        <span className="text-xl">🎲</span>
      </button>

      {/* Panneau Latéral (Drawer) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 p-6 text-white shadow-2xl flex flex-col h-full overflow-y-auto">
            
            {/* En-tête */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>🎲</span> Le Comptoir de Barter
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Corps du formulaire */}
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Miser un de mes Atomes (Tâche) :</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                  value={selectedTaskUid}
                  onChange={(e) => setSelectedTaskUid(e.target.value)}
                >
                  {userTasks.length === 0 ? (
                    <option value="">Aucune tâche (Mise par défaut : 10 Kaos)</option>
                  ) : (
                    userTasks.map(t => (
                      <option key={t.uid} value={t.uid}>{t.title}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Kaos Organiques désirés :</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                  value={targetKaos}
                  onChange={(e) => setTargetKaos(Number(e.target.value))}
                  min={1}
                />
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 px-4 rounded transition-all shadow-lg mt-4"
              >
                {loading ? "Scellement du pari..." : "Lancer le Dé du Troc 🦅"}
              </button>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm mt-4">
                  ⚠️ {error}
                </div>
              )}

              {result && (
                <div className={`p-4 rounded border mt-4 ${result.isWinner ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200' : 'bg-amber-900/50 border-amber-500 text-amber-200'}`}>
                  <h4 className="font-bold">{result.isWinner ? "🎉 Victoire de la Canopée !" : "💀 Défaite : Atome consumé."}</h4>
                  <p className="text-xs mt-1">Synchronisé avec la Silice et le Graphe.</p>
                </div>
              )}
            </div>

            {/* Pied de page */}
            <div className="border-t border-slate-800 pt-4 text-xs text-slate-500 text-center">
              Îlot Zoizos • Système de Barter Sécurisé
            </div>

          </div>
        </div>
      )}
    </>
  );
};