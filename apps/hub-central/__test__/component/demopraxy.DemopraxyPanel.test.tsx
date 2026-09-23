import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DemopraxyPanel from '@/components/demopraxy/DemopraxyPanel';
import React from 'react';

describe('UI Component : DemopraxyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit rendre le panneau démopraxique avec l\'ensemble des champs de métriques et tags', () => {
    render(<DemopraxyPanel targetUserSlug="oiseau-rebelle" targetUserUid="bird_999" />);

    // 🛡️ Vérification des champs textuels et sélecteurs
    expect(screen.getByRole('heading', { name: /Le Vortex Démopraxique/i })).toBeDefined();
    expect(screen.getByText(/Catégorie de Sanction/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/ex: toxique, récidiviste/i)).toBeDefined();
    
    // 🛡️ Vérification de la présence de tous les sliders de métriques (y compris la Résonance)
    expect(screen.getByText(/Indice de Toxicité \/ Haine Systémique/i)).toBeDefined();
    expect(screen.getByText(/Récurrence documentée/i)).toBeDefined();
    expect(screen.getByText(/Capacité de Recalibrage/i)).toBeDefined();
    expect(screen.getByText(/Résonance Collective \/ Impact/i)).toBeDefined();
  });

  it('🟢 doit soumettre l\'évaluation avec la catégorie et les tags sélectionnés et afficher le résultat', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        isExcluded: true,
        actionMessage: 'Seuil d\'exclusion atteint.'
      }),
    } as Response);

    const { container } = render(<DemopraxyPanel targetUserSlug="oiseau-rebelle" targetUserUid="bird_999" />);

    // 🔥 Contournement JSDOM : Soumission directe du formulaire
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    // Vérification que l'appel a bien eu lieu
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // ⏱️ findByText pour le rendu asynchrone
    const sanctuaryText = await screen.findByText(/Sanctuaire Isolé/i);
    expect(sanctuaryText).toBeDefined();

    const debateButton = await screen.findByRole('button', { name: /Débattre \(Gardiens\)/i });
    expect(debateButton).toBeDefined();
    
    // Ouverture du tiroir des gardiens
    fireEvent.click(debateButton);

    const registerText = await screen.findByText(/Registre des Débats/i);
    expect(registerText).toBeDefined();
  });
});