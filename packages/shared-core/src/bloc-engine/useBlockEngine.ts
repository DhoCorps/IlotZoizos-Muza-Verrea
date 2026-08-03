// packages/shared-core/src/block-engine/useBlockEngine.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import { UniversalBlock, BlockLayout } from '../../../types/src/core/bloc.types';

export function useBlockEngine(initialBlocks: UniversalBlock[] = []) {
  const [blocks, setBlocks] = useState<UniversalBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Calcul dynamique et mémoïsé du bloc actuellement sélectionné
  const selectedBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // Mettre à jour la disposition d'un bloc (largeur / position)
  const updateLayout = useCallback((id: string, newLayout: Partial<BlockLayout>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, layout: { ...b.layout, ...newLayout } } : b));
  }, []);

  // Mettre à jour les données métiers d'un bloc
  const updateData = useCallback((id: string, newData: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data: { ...b.data, ...newData } } : b));
  }, []);

  // Ajouter un nouveau bloc
  const addBlock = useCallback((newBlock: UniversalBlock) => {
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, []);

  // Activer/Désactiver un bloc
  const toggleBlock = useCallback((id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b));
  }, []);

  // Réorganiser l'ordre
  const reorderBlocks = useCallback((startIndex: number, endIndex: number) => {
    setBlocks(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  return {
    blocks,
    selectedBlock,
    selectedBlockId,
    setSelectedBlockId,
    updateLayout,
    updateData,
    addBlock,
    toggleBlock,
    reorderBlocks,
    setBlocks
  };
}