import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyrightBanner } from '@/components/global/CopyrightBanner';
import { CopyrightMetadata } from '@ilot/types';

describe('Composant : CopyrightBanner (UX & DRY)', () => {
  
  describe('Mode : DISPLAY', () => {
    it('🟢 doit afficher correctement une œuvre originale avec badge exclusif', () => {
      const meta: CopyrightMetadata = { role: 'CREATOR', isExclusiveIlot: true };
      render(<CopyrightBanner mode="display" metadata={meta} />);

      expect(screen.getByText('🎨 Œuvre Originale')).toBeDefined();
      expect(screen.getByText('✨ Exclusivité Îlot')).toBeDefined();
      // Le champ d'auteur original ne doit pas s'afficher pour un CREATOR
      expect(screen.queryByText(/D'après l'œuvre originale/)).toBeNull();
    });

    it('🟢 doit afficher les notes et l\'auteur original pour un SUBLIMATOR', () => {
      const meta: CopyrightMetadata = { 
        role: 'SUBLIMATOR', 
        originalAuthor: 'Arthur Schopenhauer',
        originalWorkTitle: 'Le Monde comme volonté',
        sublimationNotes: 'Traduction modernisée',
        isExclusiveIlot: false
      };
      render(<CopyrightBanner mode="display" metadata={meta} />);

      expect(screen.getByText('✨ Œuvre Sublimée')).toBeDefined();
      expect(screen.getByText(/Arthur Schopenhauer/)).toBeDefined();
      expect(screen.getByText(/Le Monde comme volonté/)).toBeDefined();
      expect(screen.getByText(/Traduction modernisée/)).toBeDefined();
    });
  });

  describe('Mode : EDIT (Formulaires)', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('🟢 doit afficher les champs additionnels quand on passe de CREATOR à SUBLIMATOR', async () => {
      const user = userEvent.setup();
      const meta: CopyrightMetadata = { role: 'CREATOR', isExclusiveIlot: false };
      
      const { rerender } = render(<CopyrightBanner mode="edit" metadata={meta} onChange={mockOnChange} />);
      
      // Les champs originaux ne sont pas là
      expect(screen.queryByLabelText(/Auteur Original/)).toBeNull();

      // On change le rôle via le select
      const select = screen.getByLabelText(/Votre rôle/i);
      await user.selectOptions(select, 'SUBLIMATOR');

      // Vérifie que le composant parent reçoit l'appel
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ role: 'SUBLIMATOR' }));

      // On simule la redescente de la prop mise à jour
      rerender(<CopyrightBanner mode="edit" metadata={{ role: 'SUBLIMATOR', isExclusiveIlot: false }} onChange={mockOnChange} />);
      
      // Les champs apparaissent
      expect(screen.getByLabelText(/Auteur Original/i)).toBeDefined();
      expect(screen.getByLabelText(/Notes de sublimation/i)).toBeDefined();
    });

    it('🔴 RÈGLE MÉTIER : doit désactiver et décocher la case Exclusivité si le rôle est CURATOR', async () => {
      const user = userEvent.setup();
      const meta: CopyrightMetadata = { role: 'CREATOR', isExclusiveIlot: true };
      
      render(<CopyrightBanner mode="edit" metadata={meta} onChange={mockOnChange} />);
      
      const checkbox = screen.getByLabelText(/Exclusivité/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
      expect(checkbox.disabled).toBe(false);

      // L'utilisateur passe en CURATOR
      const select = screen.getByLabelText(/Votre rôle/i);
      await user.selectOptions(select, 'CURATOR');

      // Le parent reçoit un objet où l'exclusivité a été forcée à FALSE par la sécurité UI
      expect(mockOnChange).toHaveBeenCalledWith({
        role: 'CURATOR',
        isExclusiveIlot: false
      });
    });

    it('🟢 RÈGLE MÉTIER : doit verrouiller l\'UI de la case Exclusivité pour un CURATOR', () => {
      const meta: CopyrightMetadata = { role: 'CURATOR', isExclusiveIlot: false };
      render(<CopyrightBanner mode="edit" metadata={meta} onChange={mockOnChange} />);
      
      const checkbox = screen.getByLabelText(/Exclusivité/i) as HTMLInputElement;
      
      // Visuellement, la case doit être désactivée (disabled)
      expect(checkbox.disabled).toBe(true);
    });
  });
});