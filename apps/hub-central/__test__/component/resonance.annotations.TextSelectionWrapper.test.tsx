import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TextSelectionWrapper } from '@/components/resonance/annotations/TextSelectionWrapper';
import { toast } from 'sonner';
import React from 'react';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe('UI & Logique : TextSelectionWrapper (Wrapper de Surlignage Universel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('🟢 doit rendre les enfants correctement', () => {
    render(
      <TextSelectionWrapper targetUid="book_123" targetType="BOOK" targetTitle="Le Codex">
        <p>Ceci est un texte de test pour la liseuse ou le blog.</p>
      </TextSelectionWrapper>
    );

    expect(screen.getByText('Ceci est un texte de test pour la liseuse ou le blog.')).toBeDefined();
  });

  it('🟢 doit afficher le bouton contextuel lors d\'une sélection de texte et ouvrir la modale d\'écho', async () => {
    // 1. Simulation d'une sélection de texte native
    const mockRemoveAllRanges = vi.fn();
    const mockGetSelection = () => ({
      toString: () => 'texte de test',
      isCollapsed: false,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ left: 150, top: 200, width: 80, height: 20 })
      }),
      removeAllRanges: mockRemoveAllRanges
    });
    window.getSelection = vi.fn().mockImplementation(mockGetSelection);

    // Mock de la réponse de l'API universelle d'annotation
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(
      <TextSelectionWrapper targetUid="article_999" targetType="ARTICLE" targetTitle="Monorépo Abyss">
        <p role="main">Ceci est un texte de test pour la liseuse ou le blog.</p>
      </TextSelectionWrapper>
    );

    // 2. Déclenchement de l'événement mouseUp sur le conteneur
    const containerNode = screen.getByRole('main').parentElement!;
    fireEvent.mouseUp(containerNode);

    // 3. Vérification que le bouton contextuel "Vibrer sur ce passage" apparaît
    const popupBtn = await screen.findByText(/Vibrer sur ce passage/i);
    expect(popupBtn).toBeDefined();

    // 4. Clic pour ouvrir la modale de surlignage
    fireEvent.click(popupBtn);

    // Vérifie que la modale s'affiche avec le texte sélectionné
    expect(screen.getByText(/Surlignage Émotionnel/i)).toBeDefined();
    expect(screen.getAllByText(/texte de test/).length).toBeGreaterThan(0);

    // 5. Interaction avec la modale : sélection d'un émoji et ajout d'un commentaire
    const emojiBtn = screen.getByText('💡');
    fireEvent.click(emojiBtn);

    const commentInput = screen.getByPlaceholderText(/Partage ton écho/i);
    fireEvent.change(commentInput, { target: { value: 'Une fulgurance remarquable.' } });

    // 6. Soumission du formulaire
    const submitBtn = screen.getByText(/Diffuser l'écho/i);
    fireEvent.click(submitBtn);

    // 7. Validation de l'appel réseau vers l'API universelle
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/annotations', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"targetUid":"article_999"'),
      }));

      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody).toMatchObject({
        targetType: 'ARTICLE',
        targetTitle: 'Monorépo Abyss',
        selectedText: 'texte de test',
        emotion: '💡',
        comment: 'Une fulgurance remarquable.'
      });

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Codex'));
      expect(mockRemoveAllRanges).toHaveBeenCalled();
    });
  });
});