// apps/hub-central/__test__/components/abyss-blog/EchosRemarquables.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EchosRemarquables } from '@/components/abyss-blog/EchosRemarquables';

describe('UI : EchosRemarquables (Sceau de l\'Érudit)', () => {
  const mockComments: any[] = [
    {
      uid: 'comm-1',
      actorUid: 'oiseau_111',
      content: 'Un commentaire ordinaire sans sceau.',
      isScholarSealed: false,
      isHidden: false,
      createdAt: new Date().toISOString()
    },
    {
      uid: 'comm-2',
      actorUid: 'oiseau_222',
      content: 'Une réflexion magnifique qui mérite la postérité.',
      isScholarSealed: true,
      isHidden: false,
      createdAt: new Date().toISOString()
    },
    {
      uid: 'comm-3',
      actorUid: 'oiseau_333',
      content: 'Un commentaire scellé mais occulté.',
      isScholarSealed: true,
      isHidden: true,
      createdAt: new Date().toISOString()
    }
  ];

  it('🟢 ne doit rien rendre si aucun commentaire n\'a le Sceau de l\'Érudit', () => {
    const { container } = render(
      <EchosRemarquables comments={[mockComments[0]]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('🟢 doit afficher uniquement les échos porteurs du Sceau de l\'Érudit non occultés', () => {
    render(<EchosRemarquables comments={mockComments} />);

    // Le titre de la section doit être présent
    expect(screen.getByText('Échos Remarquables')).toBeDefined();

    // Le commentaire ordinaire ne doit PAS apparaître
    expect(screen.queryByText('Un commentaire ordinaire sans sceau.')).toBeNull();

    // Le commentaire occulté ne doit PAS apparaître
    expect(screen.queryByText('Un commentaire scellé mais occulté.')).toBeNull();

    // Le commentaire valide avec le sceau doit apparaître
    expect(screen.getByText(/Une réflexion magnifique qui mérite la postérité/i)).toBeDefined();
    expect(screen.getByText('📜 Sceau de l\'Érudit')).toBeDefined();
  });
});