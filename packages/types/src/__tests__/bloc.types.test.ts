// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlockEngine } from '../../../shared-core/src/bloc-engine/useBlockEngine';
import { UniversalBlock } from '../core/bloc.types';

const mockInitialBlocks: UniversalBlock[] = [
  {
    id: 'block-1',
    type: 'test-type',
    title: 'Test Block',
    enabled: true,
    layout: { x: 0, y: 0, w: 12, h: 2 },
    data: { text: 'Hello Matrice' }
  }
];

describe('Block Engine Core (Noyau Universel)', () => {
  
  it('doit initialiser les blocs et sélectionner correctement', () => {
    const { result } = renderHook(() => useBlockEngine(mockInitialBlocks));

    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.selectedBlockId).toBeNull();
    expect(result.current.selectedBlock).toBeNull();

    act(() => {
      result.current.setSelectedBlockId('block-1');
    });

    expect(result.current.selectedBlockId).toBe('block-1');
    expect(result.current.selectedBlock?.data.text).toBe('Hello Matrice');
  });

  it('doit mettre à jour les données métiers d’un bloc', () => {
    const { result } = renderHook(() => useBlockEngine(mockInitialBlocks));

    act(() => {
      result.current.updateData('block-1', { text: 'Donnée Modifiée' });
    });

    expect(result.current.blocks[0].data.text).toBe('Donnée Modifiée');
  });

  it('doit modifier la disposition (layout) d’un bloc', () => {
    const { result } = renderHook(() => useBlockEngine(mockInitialBlocks));

    act(() => {
      result.current.updateLayout('block-1', { w: 6 });
    });

    expect(result.current.blocks[0].layout.w).toBe(6);
  });

  it('doit ajouter un nouveau bloc et le sélectionner', () => {
    const { result } = renderHook(() => useBlockEngine(mockInitialBlocks));

    const newBlock: UniversalBlock = {
      id: 'block-2',
      type: 'test-type-2',
      title: 'Nouveau Bloc',
      enabled: true,
      layout: { x: 0, y: 2, w: 6, h: 2 },
      data: { value: 42 }
    };

    act(() => {
      result.current.addBlock(newBlock);
    });

    expect(result.current.blocks).toHaveLength(2);
    expect(result.current.selectedBlockId).toBe('block-2');
    expect(result.current.selectedBlock?.title).toBe('Nouveau Bloc');
  });

  it('doit activer et désactiver un bloc', () => {
    const { result } = renderHook(() => useBlockEngine(mockInitialBlocks));

    expect(result.current.blocks[0].enabled).toBe(true);

    act(() => {
      result.current.toggleBlock('block-1');
    });

    expect(result.current.blocks[0].enabled).toBe(false);
  });

});