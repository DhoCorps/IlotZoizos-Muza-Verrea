import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Constellation3D, ConstellationNode, ConstellationLink } from '@/components/observatory/Constellation3D';
import React from 'react';

// Mock de l'API Canvas pour l'environnement JSDOM
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
});

const mockNodes: ConstellationNode[] = [
  { id: 'user-1', name: 'Oiseau Alpha', type: 'USER', x: 100, y: 100 },
  { id: 'proj-1', name: 'Îlot Zoizos', type: 'PROJECT', x: 200, y: 200 },
];

const mockLinks: ConstellationLink[] = [
  { source: 'user-1', target: 'proj-1', type: 'FOLLOWS' },
];

describe('Composant : Constellation3D', () => {
  it('🟢 doit rendre le canvas et afficher le titre de la constellation', () => {
    render(<Constellation3D nodes={mockNodes} links={mockLinks} />);
    
    const title = screen.getByText(/Constellation de la Canopée/i);
    expect(title).toBeDefined();

    const canvas = screen.getByLabelText('Galaxie interactive de la constellation');
    expect(canvas).toBeDefined();
  });

  it('🟢 doit détecter le clic sur une étoile et afficher ses détails', () => {
    const handleNodeClick = vi.fn();
    render(<Constellation3D nodes={mockNodes} links={mockLinks} onNodeClick={handleNodeClick} />);

    const canvas = screen.getByLabelText('Galaxie interactive de la constellation');
    
    // Simulation d'un clic proche des coordonnées x: 100, y: 100 de "Oiseau Alpha"
    fireEvent.click(canvas, { clientX: 100, clientY: 100 });

    expect(handleNodeClick).toHaveBeenCalledTimes(1);
    expect(handleNodeClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1', name: 'Oiseau Alpha' }));
    
    // 🌿 Sélection directe et robuste via le test-id
    const nodeNameElement = screen.getByTestId('selected-node-name');
    expect(nodeNameElement.textContent).toBe('Oiseau Alpha');
  });
});