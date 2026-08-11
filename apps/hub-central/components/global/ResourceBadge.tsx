// apps/hub-central/components/global/ResourceBadge.tsx
import React from 'react';
import { AssetType } from '@ilot/types';
import { RESOURCE_REGISTRY } from '@/constants/resources.config';

interface ResourceBadgeProps {
  type: AssetType;
  amount?: number;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ResourceBadge: React.FC<ResourceBadgeProps> = ({ 
  type, 
  amount, 
  size = 'md' 
}) => {
  const config = RESOURCE_REGISTRY[type] || {
    label: type,
    symbol: '💎',
    color: 'text-white',
    glowColor: 'bg-slate-800 border-slate-700',
    description: 'Ressource de l’Îlot.'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-3 py-1 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2.5'
  };

  return (
    <div className={`inline-flex items-center font-mono rounded-xl border border-white/10 bg-slate-900/80 shadow-lg backdrop-blur-md transition-all hover:scale-105 ${sizeClasses[size]} ${config.glowColor}`}>
      <span className="text-base">{config.symbol}</span>
      <span className={`font-bold ${config.color}`}>
        {amount !== undefined ? amount.toLocaleString() : config.label}
      </span>
      {amount !== undefined && (
        <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider ml-0.5">
          {config.label}
        </span>
      )}
    </div>
  );
};