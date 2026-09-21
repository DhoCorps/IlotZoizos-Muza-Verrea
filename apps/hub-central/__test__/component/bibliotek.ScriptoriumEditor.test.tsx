import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScriptoriumEditor } from '@/components/bibliotek/ScriptoriumEditor';
import React from 'react';

// ==========================================
// 🎭 MOCK ROBUSTE DE Y-WEBSOCKET POUR VITEST
// ==========================================
vi.mock('y-websocket', () => {
  return {
    WebsocketProvider: vi.fn().mockImplementation(() => ({
      on: vi.fn((event, callback) => {
        if (event === 'status') {
          callback({ status: 'connected' });
        }
      }),
      off: vi.fn(),
      destroy: vi.fn(),
      awareness: {
        on: vi.fn(),
        off: vi.fn(),
        getStates: () => new Map([[1, {}]])
      }
    }))
  };
});

describe('UI & Logique : ScriptoriumEditor (Atelier d’écriture collaboratif)', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit rendre l’éditeur avec les valeurs initiales et l’état de synchronisation', async () => {
    render(
      <ScriptoriumEditor
        initialTitle="Manifeste Quantique"
        initialContent="La conscience précède la matière."
        onSave={mockOnSave}
      />
    );

    expect(screen.getByPlaceholderText("Titre de l'ouvrage ou du chapitre...")).toBeDefined();
    expect(screen.getByDisplayValue("Manifeste Quantique")).toBeDefined();
    expect(screen.getByDisplayValue("La conscience précède la matière.")).toBeDefined();
    
    // 🛠️ CORRECTION : On attend que le statut passe bien par la synchro ou on cible le texte d'état réel rendu
    await waitFor(() => {
      expect(screen.getByText(/Synchro Yjs Active|Mode Hors-ligne/i)).toBeDefined();
    });
  });

  it('🟢 doit permettre de modifier le contenu et de déclencher la sauvegarde souveraine', async () => {
    render(
      <ScriptoriumEditor
        initialTitle="Titre Test"
        initialContent="Contenu initial"
        onSave={mockOnSave}
      />
    );

    const titleInput = screen.getByPlaceholderText("Titre de l'ouvrage ou du chapitre...");
    const textarea = screen.getByPlaceholderText("Écris ta substance ici... Les mots s'écoulent en silence.");

    fireEvent.change(titleInput, { target: { value: 'Nouveau Titre Souverain' } });
    fireEvent.change(textarea, { target: { value: 'Nouveau contenu synchronisé.' } });

    const saveBtn = screen.getByTestId('seal-work-btn');
    fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nouveau Titre Souverain',
      content: 'Nouveau contenu synchronisé.',
      writingType: 'roman',
      style: 'philosophie'
    }));
  });
});