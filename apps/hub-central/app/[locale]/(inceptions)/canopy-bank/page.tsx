import React from 'react';
import { RESOURCE_REGISTRY } from '@/constants/resources.config';
import { AssetType } from '@ilot/types';
import { CanopySubsidySection } from '@/components/canopy/CanopySubsidySection';
import { KomptaLedgerService } from '@ilot/infrastructure';
import { SubsidyModel } from '@ilot/infrastructure';

// Simulation de récupération des données de la Banque Centrale
async function getTreasuryData() {
  // 1. Récupération dynamique des soldes de la Banque Centrale depuis le Grand Livre
  const rawBalances = await KomptaLedgerService.getUserBalances('system_canopy_treasury');
  
  // 2. Transformation dynamique en tableau de réserves exploitable par la vue
  const reserves = Object.entries(rawBalances).map(([type, amount]) => ({
    type: type as AssetType,
    amount: Number(amount) || 0
    
  }));

  // 3. Comptage dynamique des paris absorbés (récupéré depuis les références du grand livre ou le modèle)
  const totalLostBetsCollected = await KomptaLedgerService.countEntriesByCategory('BET_LOSS', 'system_canopy_treasury');

  // 4. Nombre total de dossiers de subvention en attente ou payés
  const totalSubsidiesProcessed = await SubsidyModel.countDocuments();

  return {
    treasuryUid: 'system_canopy_treasury',
    reserves: reserves.length > 0 ? reserves : [
      { type: 'TOX' as AssetType, amount: 0 },
      { type: 'DHO' as AssetType, amount: 0 }
    ],
    totalLostBetsCollected,
    totalSubsidiesProcessed
  };
}

export default async function CanopyBankPage() {
  const data = await getTreasuryData();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* En-tête poétique */}
      <div className="max-w-5xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 flex items-center justify-center gap-3">
          <span>🏦</span> La Réserve de la Canopée
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm">
          Le coffre-fort vivant de l’Îlot. Ici reposent les fruits des paris manqués et la réserve souveraine, redistribués selon la conscience de la communauté.
        </p>
      </div>

      {/* Grille des réserves de la Banque */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {data.reserves.map((reserve) => {
          const config = RESOURCE_REGISTRY[reserve.type] || {
            label: reserve.type,
            symbol: '💎',
            color: 'text-white',
            glowColor: 'shadow-slate-500/20',
            description: 'Ressource souveraine de l’Îlot.'
          };

          return (
            <div 
              key={reserve.type}
              className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all hover:border-slate-700 ${config.glowColor}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl">{config.symbol}</span>
                <span className="text-xs font-mono uppercase px-2 py-1 bg-slate-800 rounded text-slate-300">
                  {reserve.type}
                </span>
              </div>
              <h3 className="text-slate-400 text-xs font-medium mb-1">{config.label}</h3>
              <div className={`text-3xl font-black ${config.color}`}>
                {reserve.amount.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
                {config.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Section informative sur l'économie */}
      <div className="max-w-5xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <span>⚖️</span> Politique Écologique et Souveraine
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Aucune ressource n'est détruite sur l'Îlot. Chaque pari perdu nourrit la canopée et renforce le fonds commun, garantissant une économie circulaire, sans inflation artificielle.
          </p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 px-5 py-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-emerald-400">{data.totalLostBetsCollected}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Paris absorbés par la Réserve</div>
        </div>
      </div>

      {/* Section interactive du Guichet des Subventions */}
      <CanopySubsidySection />
    </div>
  );
}