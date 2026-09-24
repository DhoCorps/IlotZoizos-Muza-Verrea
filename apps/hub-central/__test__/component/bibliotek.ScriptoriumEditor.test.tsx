import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScriptoriumEditor } from '@/components/bibliotek/ScriptoriumEditor';
import React from 'react';

// Mocks des WebSockets Yjs pour isoler l'éditeur
vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    awareness: { on: vi.fn(), getStates: () => new Map() },
    destroy: vi.fn()
  }))
}));

describe('Composant ScriptoriumEditor (Bibliotek & Copyright DRY)', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rendre l\'éditeur avec le titre, les types et la bannière de copyright', () => {
    render(<ScriptoriumEditor onSave={mockOnSave} />);

    expect(screen.getByPlaceholderText("Titre de l'ouvrage ou du chapitre...")).toBeDefined();
    expect(screen.getByText("Le Scriptorium")).toBeDefined();
    expect(screen.getByText(/Droits & Origines/i)).toBeDefined(); // Vérifie la présence du CopyrightBanner
  });

  it('doit transmettre les métadonnées de copyright et l\'exclusivité lors du scellement de l\'œuvre', async () => {
    const user = userEvent.setup();
    render(<ScriptoriumEditor onSave={mockOnSave} />);

    // Remplit le titre et le contenu
    const titleInput = screen.getByPlaceholderText("Titre de l'ouvrage ou du chapitre...");
    await user.type(titleInput, 'Mon Traité Philosophique');

    // Coche l'exclusivité Îlot via le CopyrightBanner
    const exclusiveCheckbox = screen.getByLabelText(/Exclusivité Îlot/i);
    await user.click(exclusiveCheckbox);

    // Clique sur le bouton de scellement
    const saveButton = screen.getByTestId('seal-work-btn');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Mon Traité Philosophique',
        copyrightMetadata: expect.objectContaining({
          role: 'CREATOR',
          isExclusiveIlot: true
        })
      }));
    });
  });
});