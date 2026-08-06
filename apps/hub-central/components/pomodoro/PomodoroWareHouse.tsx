// apps/hub-central/components/pomodoro/PomodoroWarehouse.tsx
'use client';

import React from 'react';
import { Factory, Truck, Package } from 'lucide-react';

interface PomodoroWarehouseProps {
  totalPomos: number;
}

export function PomodoroWarehouse({ totalPomos }: PomodoroWarehouseProps) {
  const warehouses = Math.floor(totalPomos / 1000);
  let remainder = totalPomos % 1000;
  
  const trucks = Math.floor(remainder / 100);
  remainder %= 100;
  
  const boxes = Math.floor(remainder / 10);
  const tomatoes = remainder % 10;

  return (
    <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase text-slate-100 tracking-tight">
            🏭 L'Entrepôt Logistique de Récolte
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Conversion industrielle de votre sueur temporelle et de vos cycles de sédimentation.
          </p>
        </div>
        <span className="px-4 py-1.5 bg-red-500/10 text-red-400 font-mono text-sm font-bold rounded-full border border-red-500/20 shadow-[0_0_15px_rgba(229,72,77,0.15)]">
          Total : {totalPomos} 🍅
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Entrepôts (1000+) */}
        <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-3 group hover:border-slate-600 transition-colors">
          <Factory size={36} className={warehouses > 0 ? "text-slate-300" : "text-slate-700"} />
          <div>
            <span className="block text-3xl font-black text-white font-mono">{warehouses}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Entrepôts (1000+)</span>
          </div>
        </div>

        {/* Camions (100+) */}
        <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-3 group hover:border-slate-600 transition-colors">
          <Truck size={36} className={trucks > 0 ? "text-slate-300" : "text-slate-700"} />
          <div>
            <span className="block text-3xl font-black text-white font-mono">{trucks}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Camions (100+)</span>
          </div>
        </div>

        {/* Cartons (10+) */}
        <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-3 group hover:border-slate-600 transition-colors">
          <Package size={36} className={boxes > 0 ? "text-amber-400" : "text-slate-700"} />
          <div>
            <span className="block text-3xl font-black text-amber-400 font-mono">{boxes}</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Cartons (10+)</span>
          </div>
        </div>

        {/* Tomates unitaires (1-9) */}
        <div className="p-6 bg-red-950/20 rounded-2xl border border-red-900/40 flex flex-col items-center justify-center text-center gap-3 shadow-[0_0_20px_rgba(229,72,77,0.05)]">
          <div className="text-4xl filter drop-shadow-[0_0_10px_rgba(229,72,77,0.4)]">
            {tomatoes > 0 ? "🍅" : <span className="text-slate-700 font-mono text-2xl">0</span>}
          </div>
          <div>
            <span className="block text-3xl font-black text-red-400 font-mono">{tomatoes}</span>
            <span className="text-[10px] uppercase tracking-widest text-red-400/80">Unités (1-9)</span>
          </div>
        </div>
      </div>
    </div>
  );
}