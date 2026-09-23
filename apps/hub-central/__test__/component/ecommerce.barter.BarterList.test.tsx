import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BarterList } from '@/components/ecommerce/barter/BarterList';
import React from 'react';

describe('Composant BarterList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('doit afficher l’état de chargement au montage', () => {
    // On ne résout pas la promesse tout de suite pour tester le loader
    vi.mocked(global.fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<BarterList />);
    expect(screen.getByText(/Recensement des ondes de troc en cours/i)).toBeDefined();
  });

  it('doit afficher l’état vide si aucune offre n’est retournée', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ([]),
    } as any);

    render(<BarterList />);

    await waitFor(() => {
      expect(screen.queryByText(/Recensement des ondes/i)).toBeNull();
    });

    expect(screen.getByText('Aucune proposition de troc en attente dans la Silice.')).toBeDefined();
  });

  it('doit rendre la liste des offres et gérer la résolution (Accepter)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ // Premier fetch (initial)
        json: async () => ([
          { uid: 'barter_1', status: 'PENDING', initiatorUid: 'user_A', offeredProductUids: ['prod_A'], requestedProductUids: ['prod_B'] }
        ]),
      } as any)
      .mockResolvedValueOnce({ // Deuxième fetch (le PATCH de résolution)
        json: async () => ({ success: true }),
      } as any)
      .mockResolvedValueOnce({ // Troisième fetch (le raffraichissement après succès)
        json: async () => ([]),
      } as any);

    render(<BarterList />);

    // Attente de l'affichage de l'offre
    expect(await screen.findByText('Flux des Troc Actifs')).toBeDefined();
    expect(screen.getByText(/Initié par : user_A/i)).toBeDefined();

    // Clic sur accepter
    const acceptBtn = screen.getByRole('button', { name: /Accepter/i });
    fireEvent.click(acceptBtn);

    // Vérification de l'appel PATCH
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ecommerce/barter', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ barterUid: 'barter_1', status: 'ACCEPTED' })
      }));
    });
  });
});