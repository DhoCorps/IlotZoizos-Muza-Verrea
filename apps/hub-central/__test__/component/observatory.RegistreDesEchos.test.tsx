import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RegistreDesEchos } from '../../components/observatory/RegistreDesEchos';

describe('UI : RegistreDesEchos (Tableau de bord de l\'Oiseau)', () => {
  const mockComments: any[] = [
    {
      uid: 'comm-1',
      targetUid: 'oeuvre_123',
      targetType: 'BLOG',
      content: 'Une réflexion passionnante sur la canopée.',
      isHidden: false,
      isScholarSealed: true,
      createdAt: new Date().toISOString()
    },
    {
      uid: 'comm-2',
      targetUid: 'oeuvre_456',
      targetType: 'PROJECT',
      content: 'Un écho secret en attente d\'occultation.',
      isHidden: true,
      isScholarSealed: false,
      createdAt: new Date().toISOString()
    }
  ];

  it('🟢 doit afficher l\'état vide si aucun commentaire n\'est fourni', () => {
    render(<RegistreDesEchos comments={[]} />);
    expect(screen.getByText(/Votre registre est vierge/i)).toBeDefined();
  });

  it('🟢 doit afficher la liste des échos avec leurs métadonnées et badges', () => {
    render(<RegistreDesEchos comments={mockComments} />);

    expect(screen.getByText('Une réflexion passionnante sur la canopée.')).toBeDefined();
    expect(screen.getByText('Sceau de l\'Érudit')).toBeDefined();
    expect(screen.getByText('BLOG')).toBeDefined();
    expect(screen.getByText('PROJECT')).toBeDefined();
  });

  it('🟢 doit déclencher le callback de navigation lors du clic sur "Aller à l\'œuvre"', () => {
    const handleNavigate = vi.fn();
    render(<RegistreDesEchos comments={mockComments} onNavigateToArtifact={handleNavigate} />);

    const buttons = screen.getAllByRole('button', { name: /Aller à l'œuvre/i });
    fireEvent.click(buttons[0]);

    expect(handleNavigate).toHaveBeenCalledWith('oeuvre_123', 'BLOG');
  });

  it('🟢 doit déclencher le callback d\'occultation lors du clic sur "Rendre Occulte" / "Restaurer"', () => {
    const handleToggleOccult = vi.fn();
    render(<RegistreDesEchos comments={mockComments} onToggleOccult={handleToggleOccult} />);

    const buttons = screen.getAllByRole('button', { name: /Rendre Occulte|Restaurer/i });
    fireEvent.click(buttons[0]); // Pour le premier commentaire non occulté
    fireEvent.click(buttons[1]); // Pour le deuxième commentaire déjà occulte

    expect(handleToggleOccult).toHaveBeenCalledWith('comm-1');
    expect(handleToggleOccult).toHaveBeenCalledWith('comm-2');
  });

  it('🟢 doit déclencher le callback de suppression lors du clic sur "Désintégrer"', () => {
    const handleDisintegrate = vi.fn();
    render(<RegistreDesEchos comments={mockComments} onDisintegrate={handleDisintegrate} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Désintégrer/i });
    fireEvent.click(deleteButtons[0]);

    expect(handleDisintegrate).toHaveBeenCalledWith('comm-1');
  });
});