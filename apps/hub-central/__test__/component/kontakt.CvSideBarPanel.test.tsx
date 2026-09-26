import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CVSidebarPanel } from '@/components/kontakt/cv-editor/CvSideBarPanel';
import { BlockRegistry, UniversalBlock } from '@ilot/shared-core';
import React from 'react';

const mockRegistry: BlockRegistry = {
  'test-block': {
    label: 'Bloc Test',
    defaultLayout: { x: 0, y: 0, w: 6, h: 2 },
    defaultData: { value: 'initial' },
    renderView: () => <div>View</div>,
    renderEditForm: ({ data, onChange }) => (
      <input 
        data-testid="test-input"
        value={data.value} 
        onChange={e => onChange({ value: e.target.value })} 
      />
    ),
  }
};

describe('Composant CVSidebarPanel', () => {
  it('🟢 doit afficher l’état vide si aucun bloc n’est sélectionné', () => {
    render(
      <CVSidebarPanel 
        selectedBlock={null} 
        registry={mockRegistry} 
        onUpdateData={() => {}} 
        onClose={() => {}} 
      />
    );

    expect(screen.getByText('Panneau Synaptique')).toBeInTheDocument();
  });

  it('🟢 doit rendre le formulaire d’édition du bloc sélectionné', () => {
    const selected: UniversalBlock = {
      id: 'block_1',
      type: 'test-block',
      title: 'Mon Bloc Test', // 👈 Propriété requise par UniversalBlock
      enabled: true,         // 👈 Propriété requise par UniversalBlock
      layout: { x: 0, y: 0, w: 6, h: 2 },
      data: { value: 'hello matrix' }
    };

    const mockUpdate = vi.fn();
    render(
      <CVSidebarPanel 
        selectedBlock={selected} 
        registry={mockRegistry} 
        onUpdateData={mockUpdate} 
        onClose={() => {}} 
      />
    );

    expect(screen.getByText('Config : Bloc Test')).toBeInTheDocument();
    const input = screen.getByTestId('test-input');
    expect(input).toHaveValue('hello matrix');

    fireEvent.change(input, { target: { value: 'new value' } });
    expect(mockUpdate).toHaveBeenCalledWith('block_1', { value: 'new value' });
  });
});