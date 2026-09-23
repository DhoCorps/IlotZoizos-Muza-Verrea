import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BarterMatchmakerCard } from '@/components/ecommerce/barter/BarterMatchModelCard';
import React from 'react';

describe('Composant BarterMatchmakerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('doit afficher le loader puis ne rien rendre (null) si aucune correspondance', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, matches: [] }),
    } as any);

    const { container } = render(<BarterMatchmakerCard />);

    // Vérification du Loader initial
    expect(screen.getByText(/Calcul des résonances du Barter/i)).toBeDefined();

    // Attente du rendu final vide
    await waitFor(() => {
      expect(screen.queryByText(/Calcul des résonances/i)).toBeNull();
    });

    // Le composant doit retourner null, donc le container doit être vide
    expect(container.firstChild).toBeNull();
  });

  it('doit afficher les correspondances trouvées par le Graphe', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        success: true, 
        matches: [
          {
            matchUid: 'user_99',
            matchPseudo: 'Marchand Céleste',
            itemsTheyHaveThatYouWant: ['artefact_1'],
            itemsYouHaveThatTheyWant: ['artefact_2', 'artefact_3']
          }
        ]
      }),
    } as any);

    render(<BarterMatchmakerCard />);

    // Attente de la carte
    expect(await screen.findByText('Ponts de Troc Suggérés par le Graphe')).toBeDefined();
    
    // Vérification des données
    expect(screen.getByText('Marchand Céleste')).toBeDefined();
    expect(screen.getByText(/Possède ce que tu recherches \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Recherche ce que tu proposes \(2\)/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Proposer un échange harmonique/i })).toBeDefined();
  });
});