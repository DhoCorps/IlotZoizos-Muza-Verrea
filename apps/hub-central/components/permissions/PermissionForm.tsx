'use client';

import React from 'react';
import { POWER_LEVELS, PowerLevelGroup } from '@ilot/types';

interface PermissionFormProps {
  selectedCaps: string[]; 
  onToggleCapability: (capKey: string) => void; // On attend désormais explicitement la clé
}

export const PermissionForm = ({ selectedCaps, onToggleCapability }: PermissionFormProps) => {
  return (
    <div className="bg-[#05070A]/60 p-8 md:p-10 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] mt-6 relative overflow-hidden group/permissions">
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-red-900/5 blur-[80px] rounded-full pointer-events-none opacity-0 group-hover/permissions:opacity-100 transition-opacity duration-1000 -z-10" />

      <div className="mb-8 border-b border-slate-800/50 pb-6">
        <h3 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
          <span className="text-red-500 font-mono text-sm">02.</span> Ajuster les Plumes
        </h3>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-2">
          Matrice des permissions individuelles (Capabilities)
        </p>
      </div>

      <div className="space-y-10 relative z-10">
        {/* On utilise Object.entries pour récupérer la clé technique (capKey) et les données du groupe */}
        {Object.entries(POWER_LEVELS).map(([groupKey, group]: [string, any]) => (
          <div key={groupKey} className="relative">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-slate-800"></span>
              <div>
                <h4 className="text-sm font-mono font-bold text-red-400 uppercase tracking-widest">{group.label}</h4>
                {group.description && (
                  <p className="text-[10px] text-slate-500 font-mono mt-1 opacity-70">{group.description}</p>
                )}
              </div>
            </div>
                    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* On itère sur les capabilities du groupe. 
                  IMPORTANT : capString ici doit correspondre à la clé technique attendue par le backend */}
              {group.capabilities.map((capKey: string) => { 
                const isChecked = selectedCaps.includes(capKey);
                
                return (
                  <label 
                    key={capKey} 
                    className={`flex items-start gap-4 cursor-pointer p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                      isChecked 
                        ? 'bg-red-950/20 border-red-900/50 shadow-[0_0_15px_rgba(229,72,77,0.05)] ring-1 ring-red-500/10' 
                        : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    {isChecked && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(229,72,77,0.5)]"></div>
                    )}

                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleCapability(capKey)} // ⚡ FIX : Envoi de la clé technique brute
                        className={`h-4 w-4 rounded cursor-pointer transition-colors border ${
                          isChecked 
                            ? 'text-red-500 border-red-500 focus:ring-red-500 focus:ring-offset-slate-950 bg-red-500' 
                            : 'bg-slate-950 border-slate-700 focus:ring-red-500/50 appearance-none'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className={`text-[11px] font-mono tracking-widest break-all ${isChecked ? 'text-slate-100 font-bold' : 'text-slate-500 font-medium'}`}>
                        {capKey}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};