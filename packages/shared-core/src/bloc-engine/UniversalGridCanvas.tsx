// packages/shared-core/src/block-engine/UniversalGridCanvas.tsx
'use client';

import React from 'react';
import { GripVertical, Maximize2, Trash2, Layers, Sparkles } from 'lucide-react';
import { UniversalBlock, BlockRegistry } from '../../../types/src/core/bloc.types';

export interface UniversalGridCanvasProps {
  blocks: UniversalBlock[];
  registry: BlockRegistry;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateLayout: (id: string, newLayout: any) => void;
  onToggleBlock: (id: string) => void;
  letrinFontFamily?: string;
}

export function UniversalGridCanvas({
  blocks,
  registry,
  selectedBlockId,
  onSelectBlock,
  onUpdateLayout,
  onToggleBlock,
  letrinFontFamily = 'letrin-cyber-mono'
}: UniversalGridCanvasProps) {
  const activeBlocks = blocks.filter(b => b.enabled);

  return (
    <div className={`relative w-full min-h-[700px] bg-black/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-300 ${letrinFontFamily}`}>
      {/* Grille Blueprint de fond (effet matrice) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* En-tête du Canevas */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#E5484D]" />
          <span className="text-xs font-black uppercase tracking-widest text-white">Canevas Modulaire Unifié</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400">{activeBlocks.length} bloc(s) actif(s)</span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-[#E5484D] uppercase tracking-wider shadow-sm">
            Typo : {letrinFontFamily}
          </span>
        </div>
      </div>

      {/* Rendu dynamique des blocs enregistrés */}
      <div className="grid grid-cols-12 gap-4 relative z-10">
        {activeBlocks.map((block) => {
          const isSelected = selectedBlockId === block.id;
          const registered = registry[block.type];

          if (!registered) return null;

          const ViewComponent = registered.renderView;
          const colSpanClass = 
            block.layout.w === 12 ? 'col-span-12' :
            block.layout.w === 8 ? 'col-span-12 lg:col-span-8' :
            block.layout.w === 6 ? 'col-span-12 lg:col-span-6' :
            block.layout.w === 4 ? 'col-span-12 lg:col-span-4' :
            'col-span-12';

          return (
            <div
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              className={`group relative p-5 bg-black/60 border rounded-2xl backdrop-blur-md transition-all duration-200 cursor-pointer ${
                isSelected 
                  ? 'border-[#E5484D] shadow-[0_0_25px_rgba(229,72,77,0.25)] ring-1 ring-[#E5484D]' 
                  : 'border-white/10 hover:border-white/25 hover:bg-black/70'
              } ${colSpanClass}`}
            >
              {/* Entête du bloc & Actions */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-slate-600 cursor-grab group-hover:text-slate-400 transition-colors" />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#E5484D]">
                    {registered.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextWidth = block.layout.w === 12 ? 6 : block.layout.w === 6 ? 4 : 12;
                      onUpdateLayout(block.id, { w: nextWidth });
                    }}
                    className="p-1 bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white rounded transition-colors"
                    title="Basculer la largeur du bloc"
                  >
                    <Maximize2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBlock(block.id);
                    }}
                    className="p-1 bg-red-500/10 text-red-400 hover:bg-red-500/25 rounded transition-colors"
                    title="Désactiver le bloc"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Rendu spécifique injecté par le registre */}
              <div className="relative">
                <ViewComponent data={block.data} isSelected={isSelected} />
              </div>
            </div>
          );
        })}
      </div>

      {/* État vide si aucun bloc n'est actif */}
      {activeBlocks.length === 0 && (
        <div className="py-24 text-center space-y-3 relative z-10">
          <Sparkles className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Le canevas est vide. Active ou ajoute un module depuis les outils supérieurs.
          </p>
        </div>
      )}
    </div>
  );
}