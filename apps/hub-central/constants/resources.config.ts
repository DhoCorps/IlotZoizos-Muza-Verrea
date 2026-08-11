// apps/hub-central/lib/constants/resources.config.ts
import { AssetType } from '@ilot/types';

export interface ResourceDescriptor {
  label: string;
  symbol: string;
  color: string;
  glowColor: string;
  description: string;
}

export const RESOURCE_REGISTRY: Record<AssetType, ResourceDescriptor> = {
  TOX: {
    label: 'TôX',
    symbol: '⚡',
    color: 'text-amber-400',
    glowColor: 'shadow-amber-500/20',
    description: 'La monnaie organique, volatile et énergique du minage créatif.'
  },
  DHO: {
    label: 'DhÔ',
    symbol: '🪙',
    color: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/20',
    description: 'L’étalon souverain de réserve et de grande valeur.'
  },
  KAOS: {
    label: 'Kaos Organique',
    symbol: '🌀',
    color: 'text-purple-400',
    glowColor: 'shadow-purple-500/20',
    description: 'L’énergie brute du désordre créateur.'
  },
  TASK: {
    label: 'Atome (Tâche)',
    symbol: '🧬',
    color: 'text-blue-400',
    glowColor: 'shadow-blue-500/20',
    description: 'Une brique de travail ou une création scellée.'
  },
  SUJET: {
    label: 'Sujet de Réflexion',
    symbol: '📜',
    color: 'text-indigo-400',
    glowColor: 'shadow-indigo-500/20',
    description: 'Une thèse ou un fragment philosophique.'
  },
  PARTITA: {
    label: 'Partita Musicale',
    symbol: '🎶',
    color: 'text-rose-400',
    glowColor: 'shadow-rose-500/20',
    description: 'Une partition ou un mouvement sonore.'
  },
  SAMPLE: {
    label: 'Échantillon Sonore',
    symbol: '🎙️',
    color: 'text-cyan-400',
    glowColor: 'shadow-cyan-500/20',
    description: 'Un fragment audio capturé dans la canopée.'
  },
  EURO: {
    label: 'Ancien Monde (Euro)',
    symbol: '💶',
    color: 'text-slate-400',
    glowColor: 'shadow-slate-500/20',
    description: 'Relique du vieux monde, en voie d’oubli.'
  }
};