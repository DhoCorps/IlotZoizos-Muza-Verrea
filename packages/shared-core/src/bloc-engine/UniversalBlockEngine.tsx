// packages/shared-core/src/block-engine/UniversalGridCanvas.tsx
'use client';

import React from 'react';
import { GripVertical, Maximize2, Trash2, Layers } from 'lucide-react';
import { UniversalBlock, BlockRegistry } from '../../../types/src/core/bloc.types';

interface UniversalGridCanvasProps {
  blocks: UniversalBlock[];
  registry: BlockRegistry;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateLayout: (id: string, newLayout: any) => void;
  onToggleBlock: (id: string) => void;
}

export function UniversalGridCanvas({
  blocks,
  registry,
  selectedBlockId,
  onSelectBlock,
  onUpdateLayout,
  onToggleBlock,
}: UniversalGridCanvasProps) {
  return (
    <div className="relative w-full min-h-[700px] bg-black/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl overflow-hidden shadow-2xl">
      {/* Grille Blueprint de fond */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#E5484D]" />
          <span className="text-xs font-black uppercase tracking-widest text-white">Canevas Modulaire Unifié</span>
        </div>
      </div>

      {/* Rendu dynamique des blocs enregistrés */}
      <div className="grid grid-cols-12 gap-4 relative z-10">
        {blocks.filter(b => b.enabled).map((block) => {
          const isSelected = selectedBlockId === block.id;
          const registered = registry[block.type];

          if (!registered) return null;

          const ViewComponent = registered.renderView;
          const colSpanClass = 
            block.layout.w === 12 ? 'col-span-12' :
            block.layout.w === 8 ? 'col-span-12 lg:col-span-8' :
            block.layout.w === 6 ? 'col-span-12 lg:col-span-6' :
            'col-span-12 lg:col-span-4';

          return (
            <div
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              className={`group relative p-5 bg-black/60 border rounded-2xl backdrop-blur-md transition-all cursor-pointer ${
                isSelected 
                  ? 'border-[#E5484D] shadow-[0_0_20px_rgba(229,72,77,0.2)] ring-1 ring-[#E5484D]' 
                  : 'border-white/10 hover:border-white/20'
              } ${colSpanClass}`}
            >
              {/* Entête du bloc */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-slate-600 cursor-grab" />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#E5484D]">
                    {registered.label}
                  </span>
                </div>

                {/* Actions sur le bloc */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateLayout(block.id, { w: block.layout.w === 12 ? 6 : 12 });
                    }}
                    className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded"
                  >
                    <Maximize2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBlock(block.id);
                    }}
                    className="p-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Rendu spécifique injecté */}
              <ViewComponent data={block.data} isSelected={isSelected} />
            </div>
          );
        })}
      </div>
    </div>
  );
}