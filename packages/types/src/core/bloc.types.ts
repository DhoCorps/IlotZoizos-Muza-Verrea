// packages/shared-core/src/block-engine/block.types.ts (ou bloc.types.ts)
import { ComponentType } from 'react';

export interface BlockLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UniversalBlock<T = any> {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  layout: BlockLayout;
  data: T;
}

export type BlockRegistry = Record<string, {
  label: string;
  defaultData: any;
  defaultLayout: BlockLayout;
  renderView: ComponentType<{ data: any; isSelected: boolean }>;
  renderEditForm: ComponentType<{ data: any; onChange: (newData: any) => void }>;
}>;

// 🎛️ Centralisation de l'interface du Canevas
export interface UniversalGridCanvasProps {
  blocks: UniversalBlock[];
  registry: BlockRegistry;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateLayout: (id: string, newLayout: Partial<BlockLayout>) => void;
  onToggleBlock: (id: string) => void;
  letrinFontFamily?: string;
}