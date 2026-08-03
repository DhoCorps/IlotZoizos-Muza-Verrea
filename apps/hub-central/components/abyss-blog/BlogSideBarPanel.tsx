// apps/hub-central/components/abyss/BlogSidebarPanel.tsx
'use client';

import React from 'react';
import { Terminal, X, Settings2 } from 'lucide-react';
import { UniversalBlock, BlockRegistry } from '@ilot/shared-core';

interface BlogSidebarPanelProps {
  selectedBlock: UniversalBlock | null;
  registry: BlockRegistry;
  onUpdateData: (id: string, newData: any) => void;
  onClose: () => void;
}

export function BlogSidebarPanel({
  selectedBlock,
  registry,
  onUpdateData,
  onClose
}: BlogSidebarPanelProps) {
  if (!selectedBlock) {
    return (
      <div className="p-8 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl text-center space-y-4">
        <Settings2 className="w-10 h-10 mx-auto text-slate-600 animate-pulse" />
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase text-white tracking-widest">Panneau Abyss</h3>
          <p className="text-xs font-mono text-slate-400">
            Sélectionne un bloc sur le canevas pour configurer son contenu éditorial.
          </p>
        </div>
      </div>
    );
  }

  const registered = registry[selectedBlock.type];
  if (!registered) return null;

  const EditFormComponent = registered.renderEditForm;

  return (
    <div className="p-6 bg-black/60 border border-white/10 rounded-3xl backdrop-blur-2xl space-y-6 shadow-2xl relative animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[#E5484D]" />
          <span className="text-xs font-black uppercase tracking-widest text-white">
            Config : {registered.label}
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <EditFormComponent 
          data={selectedBlock.data} 
          onChange={(newData) => onUpdateData(selectedBlock.id, newData)} 
        />
      </div>
    </div>
  );
}