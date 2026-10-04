// apps/hub-central/app/[locale]/(inceptions)/poetrik/[slug]/__tests__/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublicPoemDetailPage from '@/app/[locale]/(inceptions)/poetrik/[slug]/page';
import { PoemModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@ilot/infrastructure', () => ({
  PoemModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/components/global/UniversalComment', () => ({
  UniversalComment: () => <div data-testid="universal-comment">Module Commentaires</div>,
}));

describe('Page Publique : PublicPoemDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit afficher le poème, l\'auteur et les commentaires si le Voile de Catharsis est inactif', async () => {
    const mockPoem = {
      uid: 'poem_123',
      title: 'Aube sur l\'Îlot',
      content: 'Le soleil se lève...',
      format: 'SONNET',
      authorUid: 'bird_1',
      authorPseudo: 'OiseauPoète',
      settings: { catharsisVeil: false }
    };

    vi.mocked(PoemModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce(mockPoem)
    } as any);

    const ui = await PublicPoemDetailPage({
      params: Promise.resolve({ slug: 'poem_123', locale: 'fr' })
    });

    render(ui);

    // Utilisation de getAllByText car le titre est dans le fil d'Ariane et dans la carte
    const titleElements = screen.getAllByText('Aube sur l\'Îlot');
    expect(titleElements.length).toBeGreaterThan(0);

    expect(screen.getByText('OiseauPoète')).toBeDefined();
    expect(screen.getByText('Le soleil se lève...')).toBeDefined();
    expect(screen.getByTestId('universal-comment')).toBeDefined();
  });

  it('🟢 doit masquer les commentaires et afficher le message du Sanctuaire si le Voile de Catharsis est actif', async () => {
    const mockPoemCatharsis = {
      uid: 'poem_456',
      title: 'Silence Éternel',
      content: 'Dans le calme absolu...',
      format: 'HAIKU',
      authorUid: 'bird_2',
      authorPseudo: 'MoineZen',
      settings: { catharsisVeil: true }
    };

    vi.mocked(PoemModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce(mockPoemCatharsis)
    } as any);

    const ui = await PublicPoemDetailPage({
      params: Promise.resolve({ slug: 'poem_456', locale: 'fr' })
    });

    render(ui);

    const titleElements = screen.getAllByText('Silence Éternel');
    expect(titleElements.length).toBeGreaterThan(0);

    expect(screen.getByText('Sanctuaire sous le Voile de Catharsis')).toBeDefined();
    expect(screen.queryByTestId('universal-comment')).toBeNull();
  });
});