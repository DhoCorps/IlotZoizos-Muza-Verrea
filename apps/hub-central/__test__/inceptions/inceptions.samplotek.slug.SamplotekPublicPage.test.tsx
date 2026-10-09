import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublicSampleDetailPage from '@/app/[locale]/(inceptions)/samplotek/[slug]/page';
import { SampleModel } from '@ilot/infrastructure';
import { notFound } from 'next/navigation';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DEPENDANCES ET COMPOSANTS ENFANTS
// -------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}));

// Mock de Mongoose (SampleModel)
vi.mock('@ilot/infrastructure', () => ({
  SampleModel: {
    findOne: vi.fn(() => ({
      lean: vi.fn().mockResolvedValue(null)
    })),
    find: vi.fn(() => ({
      lean: vi.fn().mockResolvedValue([])
    }))
  }
}));

vi.mock('@/components/global/UniversalComment', () => ({
  UniversalComment: ({ targetUid, currentAuthorUid }: any) => (
    <div data-testid="universal-comment">
      Commentaires pour {targetUid} par {currentAuthorUid}
    </div>
  ),
}));

// 🎛️ CORRECTION : Chemin du mock aligné sur l'import de la page (global) et utilisation de digitalSignature
vi.mock('@/components/global/CopyrightBanner', () => ({
  CopyrightBanner: ({ digitalSignature }: any) => (
    <div data-testid="copyright-banner">
      Sceau : {digitalSignature}
    </div>
  ),
}));

const mockSampleData = {
  uid: 'samp_123',
  title: 'Kick Canopée Magistral',
  tempoBpm: 140,
  musicalKey: 'F minor',
  style: 'Techno Ambiante',
  authorUid: 'user_456',
  digitalSignature: 'SHA256_mock_hash_890',
  usedSamples: ['samp_abc', 'samp_def'],
  settings: {
    catharsisVeil: false
  }
};

const mockUsedSamplesData = [
  { uid: 'samp_abc', title: 'Snare Sec', slug: 'snare-sec' },
  { uid: 'samp_def', title: 'HiHat Glacé', slug: 'hihat-glace' }
];

describe('Page Publique : SamploTek [slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit déclencher une erreur 404 (notFound) si le sample n\'existe pas', async () => {
    (SampleModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    });

    try {
      await PublicSampleDetailPage({ params: Promise.resolve({ slug: 'sample-inconnu', locale: 'fr' }) });
    } catch (e) {
      // Ignore l'erreur levée par notFound() pendant le test
    }

    expect(notFound).toHaveBeenCalled();
  });

  it('🟢 doit afficher les métadonnées principales du sample', async () => {
    (SampleModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockSampleData)
    });

    const Page = await PublicSampleDetailPage({ params: Promise.resolve({ slug: 'kick-canopee-magistral', locale: 'fr' }) });
    render(Page);

    // 🎛️ CORRECTION : Utilisation de getAllByText car le texte est dans le header ET le fil d'Ariane
    const titleElements = screen.getAllByText('Kick Canopée Magistral');
    expect(titleElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText('140 BPM')).toBeDefined();
    expect(screen.getByText('Techno Ambiante')).toBeDefined();
  });

  it('🟢 [ROADMAP] doit afficher le Voile de Catharsis si actif, masquant les commentaires', async () => {
    const catharsisSample = { ...mockSampleData, settings: { catharsisVeil: true } };
    (SampleModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(catharsisSample)
    });

    const Page = await PublicSampleDetailPage({ params: Promise.resolve({ slug: 'kick-canopee-magistral', locale: 'fr' }) });
    render(Page);

    expect(screen.getByText('Sanctuaire sous le Voile de Catharsis')).toBeDefined();
    // Le UniversalComment ne doit pas être rendu
    expect(screen.queryByTestId('universal-comment')).toBeNull();
  });

  it('🟢 [ROADMAP] doit intégrer le CopyrightBanner et le UniversalComment (si pas de voile)', async () => {
    (SampleModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockSampleData)
    });

    const Page = await PublicSampleDetailPage({ params: Promise.resolve({ slug: 'kick-canopee-magistral', locale: 'fr' }) });
    render(Page);

    // Vérification du Copyright Banner
    expect(screen.getByTestId('copyright-banner')).toBeDefined();
    expect(screen.getByText('Sceau : SHA256_mock_hash_890')).toBeDefined();

    // Vérification du système de commentaires
    expect(screen.getByTestId('universal-comment')).toBeDefined();
  });

  it('🟢 [ROADMAP] doit afficher le Tissage des Muses (Neo4j dependencies)', async () => {
    (SampleModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockSampleData)
    });
    
    (SampleModel.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockUsedSamplesData)
    });

    const Page = await PublicSampleDetailPage({ params: Promise.resolve({ slug: 'kick-canopee-magistral', locale: 'fr' }) });
    render(Page);

    expect(screen.getByText('Le Tissage des Muses')).toBeDefined();
    expect(screen.getByText('Snare Sec')).toBeDefined();
    expect(screen.getByText('HiHat Glacé')).toBeDefined();
  });
});