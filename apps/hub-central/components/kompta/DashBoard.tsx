// apps/hub-central/components/kompta/KomptaDashboard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ArrowDownLeft, ArrowUpRight, Wallet, Activity, Loader2 } from 'lucide-react';

export function KomptaDashboard() {
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/kompta/ledger')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setLedgerData(json.data);
        }
      })
      .catch(err => console.error("Erreur chargement Kompta :", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const { entries = [], summary = { totalCredits: 0, totalDebits: 0, netBalance: 0, transactionCount: 0 } } = ledgerData || {};

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 animate-in fade-in duration-500">
      
      {/* En-tête Kompta */}
      <div className="p-8 bg-slate-900/80 border border-amber-500/30 rounded-3xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <ShieldCheck size={12} /> Grand Livre Inaltérable
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight">Kompta — Comptabilité Temps Réel</h1>
          <p className="text-xs font-mono text-slate-400">Traçabilité cryptographique et synchronisation instantanée de vos flux financiers.</p>
        </div>
      </div>

      {/* Cartes de Synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ArrowDownLeft size={16} className="text-emerald-400" /> Total Crédits
          </span>
          <span className="text-2xl font-black font-mono text-emerald-400">+{summary.totalCredits.toFixed(2)} €</span>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ArrowUpRight size={16} className="text-rose-400" /> Total Débits
          </span>
          <span className="text-2xl font-black font-mono text-rose-400">-{summary.totalDebits.toFixed(2)} €</span>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Wallet size={16} className="text-amber-400" /> Flux Net
          </span>
          <span className={`text-2xl font-black font-mono ${summary.netBalance >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
            {summary.netBalance.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* Historique du Grand Livre */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md space-y-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Activity size={16} className="text-amber-400" /> Historique des Écritures ({summary.transactionCount})
        </h3>

        <div className="space-y-3">
          {entries.map((entry: any) => (
            <div key={entry.entryUid} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-amber-500/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-bold ${entry.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {entry.category}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{entry.description}</p>
                <p className="text-[10px] font-mono text-slate-500 truncate max-w-md">Hash : {entry.entryHash}</p>
              </div>

              <div className={`text-base font-black font-mono ${entry.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {entry.type === 'CREDIT' ? '+' : '-'}{(entry.amountCents / 100).toFixed(2)} {entry.currency}
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-xs font-mono uppercase tracking-widest">
              Aucune écriture enregistrée dans votre grand livre pour le moment.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}