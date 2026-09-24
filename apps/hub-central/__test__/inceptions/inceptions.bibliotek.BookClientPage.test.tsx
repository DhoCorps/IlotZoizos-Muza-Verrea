import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookDetailsPage, { generateMetadata } from '@/app/[locale]/(inceptions)/bibliotek/[slug]/page';
import React from 'react';

// 🎭 MOCK PARTIEL DE L'INFRASTRUCTURE (Utilisation de importOriginal pour ne rien casser)
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@ilot/infrastructure/src/database/mongoose', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

import { findEntityBySlugOrUid } from '@ilot/infrastructure';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
}));

vi.mock('@/components/bibliotek/PapierAncreReader', () => ({
  PapierAncreReader: ({ book }: { book: any }) => (
    <div data-testid="mock-reader">
      <h1>{book.title}</h1>
    </div>
  ),
}));

vi.mock('@/components/bibliotek/ScholarlyNotesSection', () => ({
  ScholarlyNotesSection: () => <div data-testid="mock-scholarly-notes">Notes d'Érudits</div>,
}));

// 🚀 Mock du composant CopyrightBanner pour les tests de page
vi.mock('@/components/global/CopyrightBanner', () => ({
  CopyrightBanner: ({ metadata }: { metadata: any }) => (
    <div data-testid="mock-copyright-banner">
      <span>{metadata?.role}</span>
      {metadata?.isExclusiveIlot && <span>Exclusivité</span>}
    </div>
  ),
}));

describe('SSR & SEO : BookDetailsPage ([slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit générer les métadonnées SEO OpenGraph de manière dynamique', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      title: 'Traité des Oiseaux',
      slug: 'traite-des-oiseaux',
      status: 'PUBLISHED',
      authorSlug: 'zen-bird',
      seo: { metaTitle: 'Traité personnalisé' }
    } as any);

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr', slug: 'traite-des-oiseaux' }) });

    expect(metadata.title).toBe('Traité personnalisé');
    expect((metadata.openGraph as any)?.type).toBe('book');
  });

  it('🟢 doit rendre la liseuse, la bannière de copyright et la section des érudits pour un livre publié', async () => {
    const mockBook = {
      uid: 'book_123',
      title: 'Le Chant des Étoiles',
      slug: 'chant-des-etoiles',
      status: 'PUBLISHED',
      fileUrl: 'https://cdn.ilot/book.txt',
      copyrightMetadata: { role: 'SUBLIMATOR', isExclusiveIlot: true }
    };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockBook as any);

    const ui = await BookDetailsPage({ params: Promise.resolve({ locale: 'fr', slug: 'chant-des-etoiles' }) });
    render(ui);

    expect(screen.getByTestId('mock-reader')).toBeDefined();
    expect(screen.getByText('Le Chant des Étoiles')).toBeDefined();
    expect(screen.getByTestId('mock-copyright-banner')).toBeDefined();
    expect(screen.getByText('SUBLIMATOR')).toBeDefined();
    expect(screen.getByText('Exclusivité')).toBeDefined();
    expect(screen.getByTestId('mock-scholarly-notes')).toBeDefined();
  });

  it('🔴 doit déclencher une 404 si l\'ouvrage n\'existe pas ou est un brouillon (DRAFT)', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    await expect(
      BookDetailsPage({ params: Promise.resolve({ locale: 'fr', slug: 'inconnu' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});