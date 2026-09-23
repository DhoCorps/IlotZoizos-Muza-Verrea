import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UniversalComment } from '@/components/global/UniversalComment';
import React from 'react';

vi.mock('@/components/global/UniversalCommentDrawer', () => ({
  useCommentDrawer: () => ({
    openDrawer: vi.fn(),
  }),
}));

describe('Composant UniversalComment (Conteneur)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            uid: 'comm_1',
            authorUid: 'author_12345678',
            content: 'Un écho magnifique dans la canopée.',
            createdAt: new Date(),
            isScholarSealed: true,
            isHidden: false,
          },
        ],
      }),
    }) as any;
  });

  it('doit charger et afficher les commentaires à l’aide de CommentItem', async () => {
    render(<UniversalComment targetUid="prod_1" targetType="PROJECT" />);

    expect(await screen.findByText('Un écho magnifique dans la canopée.')).toBeDefined();
    
    // 🛡️ CORRECTION : L'expression régulière permet de matcher la chaîne exacte (avec ou sans l'émoji) en évitant l'erreur de casse
    expect(screen.getByText(/Sceau de l'Érudit/i)).toBeDefined();
  });
});