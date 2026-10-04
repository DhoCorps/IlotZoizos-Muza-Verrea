// apps/hub-central/components/poetrik/__tests__/RhymeGraphView.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RhymeGraphView } from '@/components/poetrik/RhymeGraphView';

// Mock de react-force-graph-2d
vi.mock('react-force-graph-2d', () => ({
  default: ({ onNodeClick, graphData }: any) => (
    <div data-testid="mock-force-graph">
      {graphData.nodes.map((node: any) => (
        <button 
          key={node.id} 
          data-testid={`node-${node.id}`}
          onClick={() => onNodeClick && onNodeClick(node)}
        >
          {node.name}
        </button>
      ))}
    </div>
  )
}));

describe('Composant : RhymeGraphView (Observatoire Sémantique)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('🟢 doit afficher le graphe avec les données de démonstration par défaut si aucun uid n\'est fourni', async () => {
    render(<RhymeGraphView />);
    
    expect(screen.getByText('Observatoire Sémantique (Graphe Neo4j)')).toBeDefined();
    
    // Attente du montage du composant dynamique
    await waitFor(() => {
      expect(screen.getByTestId('mock-force-graph')).toBeDefined();
      expect(screen.getByTestId('node-lex_fr_oiseau')).toBeDefined();
    });
  });

  it('🟢 doit interroger l\'API Neo4j et afficher les nœuds correspondants', async () => {
    const mockApiResponse = {
      success: true,
      data: [
        {
          uid: 'lex_fr_roseau',
          word: 'roseau',
          languageCode: 'fr',
          phoneticIpa: '/ʁo.zo/',
          syllableCount: 2,
          rhymeType: 'rich',
          matchScore: 'zo'
        }
      ]
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockApiResponse), { status: 200 })
    );

    const mockNodeClick = vi.fn();
    render(<RhymeGraphView centerWordUid="lex_fr_oiseau" onNodeClick={mockNodeClick} />);

    // Attend le chargement effectif du graphe et des données de l'API
    await waitFor(() => {
      expect(screen.getByTestId('node-lex_fr_roseau')).toBeDefined();
    });

    // Test de l'interaction au clic sur un nœud
    const nodeBtn = screen.getByTestId('node-lex_fr_roseau');
    fireEvent.click(nodeBtn);

    expect(mockNodeClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lex_fr_roseau', name: 'roseau' })
    );
  });
});