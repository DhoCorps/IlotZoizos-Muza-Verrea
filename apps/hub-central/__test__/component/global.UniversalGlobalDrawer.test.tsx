import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalCommentDrawer, useCommentDrawer } from '../../components/global/UniversalCommentDrawer';

describe('UI: UniversalCommentDrawer (Tiroir des Résonances)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useCommentDrawer.getState().closeDrawer();
    });
  });

  it('🟢 doit rester invisible si le store indique qu\'il est fermé', () => {
    render(<UniversalCommentDrawer />);
    const dialog = screen.queryByRole('dialog');
    expect(dialog).toBeNull();
  });

  it('🟢 doit s\'afficher lorsque l\'état global l\'exige', () => {
    render(<UniversalCommentDrawer />);
    
    act(() => {
      useCommentDrawer.getState().openDrawer('oeuvre_123', 'BLOG');
    });

    const dialog = screen.getByRole('dialog', { name: /tiroir des résonances/i });
    expect(dialog).toBeDefined();
    expect(screen.getByText('Échos & Résonances')).toBeDefined();
  });

  it('🔴 Verrouillage Poétique : doit exiger une réaction avant d\'afficher le formulaire', () => {
    render(<UniversalCommentDrawer />);
    act(() => useCommentDrawer.getState().openDrawer('oeuvre_123', 'BLOG'));

    expect(screen.queryByPlaceholderText(/Laissez résonner votre pensée/i)).toBeNull();
    expect(screen.getByText(/Le droit de critiquer s'achète par un acte d'amour/i)).toBeDefined();
  });

  it('🟢 Verrouillage Poétique : doit déverrouiller la zone de saisie après une réaction', () => {
    render(<UniversalCommentDrawer />);
    act(() => useCommentDrawer.getState().openDrawer('oeuvre_123', 'BLOG'));

    const reactButton = screen.getByRole('button', { name: /Laisser une part de soi/i });
    fireEvent.click(reactButton);

    expect(screen.queryByText(/Le droit de critiquer s'achète par un acte d'amour/i)).toBeNull();
    expect(screen.getByPlaceholderText(/Laissez résonner votre pensée/i)).toBeDefined();
  });

  it('🟢 Alchimie : doit afficher l\'animation de Faveur du Kosmos en cas de Jackpot', async () => {
    // On passe directement le override de test pour simuler un retour de Jackpot de manière propre et infaillible
    const mockSubmitOverride = async () => ({ success: true, isJackpot: true });

    render(<UniversalCommentDrawer testSubmitOverride={mockSubmitOverride} />);
    
    act(() => {
      useCommentDrawer.getState().openDrawer('oeuvre_123', 'BLOG');
    });

    // 1. Activer la réaction d'amour
    const reactButton = screen.getByRole('button', { name: /Laisser une part de soi/i });
    await act(async () => {
      fireEvent.click(reactButton);
    });

    // 2. Écrire le commentaire
    const textarea = screen.getByPlaceholderText(/Laissez résonner votre pensée/i);
    await act(async () => {
      fireEvent.input(textarea, { target: { value: 'Un écho magistral.' } });
    });
    
    const submitButton = screen.getByRole('button', { name: /Forger l'écho/i });
    
    // 3. Soumettre de manière asynchrone
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 4. Attente de l'overlay Gacha
    const jackpotElement = await screen.findByText(/Faveur du Kosmos !/i);
    expect(jackpotElement).toBeDefined();
  });

  it('🟢 doit se fermer lorsque l\'Oiseau clique sur le bouton de fermeture', () => {
    render(<UniversalCommentDrawer />);
    act(() => useCommentDrawer.getState().openDrawer('oeuvre_123', 'BLOG'));

    const closeButton = screen.getByRole('button', { name: /Fermer le tiroir/i });
    fireEvent.click(closeButton);

    expect(useCommentDrawer.getState().isOpen).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});