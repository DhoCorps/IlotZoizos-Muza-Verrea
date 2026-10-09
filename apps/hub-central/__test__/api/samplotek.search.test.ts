import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/samplotek/search/route';
import { SampleModel } from '@ilot/infrastructure';
import { getCachedSamples } from '@/lib/cache/samplotek.cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES GUARDS
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = (global as any).__mockUser;
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

// Mock du cache
vi.mock('@/lib/cache/samplotek.cache', () => ({
  getCachedSamples: vi.fn(),
}));

// Mock robuste de Mongoose avec support du chaînage : .sort().skip().limit().lean()
const mockLean = vi.fn();
const mockLimit = vi.fn(() => ({ lean: mockLean }));
const mockSkip = vi.fn(() => ({ limit: mockLimit }));
const mockSort = vi.fn(() => ({ skip: mockSkip }));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    SampleModel: {
      find: vi.fn(() => ({ sort: mockSort })),
      countDocuments: vi.fn(),
    },
  };
});

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('API SamploTek - Explorateur (GET /search)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 [CACHE] doit utiliser le cache rapide pour une requête publique sans filtres complexes', async () => {
    // Simuler un catalogue en cache de 3 samples
    const mockCatalog = [
      { uid: 's1', title: 'Kick' },
      { uid: 's2', title: 'Snare' },
      { uid: 's3', title: 'Hat' }
    ];
    vi.mocked(getCachedSamples).mockResolvedValue(mockCatalog as any);

    // Requête sans aucun paramètre
    const req = new NextRequest('http://localhost/api/samplotek/search');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(3);
    
    // Le cache a été appelé, mais Mongoose n'a pas été touché !
    expect(getCachedSamples).toHaveBeenCalledTimes(1);
    expect(SampleModel.find).not.toHaveBeenCalled();
    expect(json.pagination.total).toBe(3);
  });

  it('🟢 [DB + MODÉRATION] doit interroger la base en filtrant les quarantaines si un filtre public est actif', async () => {
    mockLean.mockResolvedValueOnce([{ uid: 's1', style: 'LoFi' }]);
    vi.mocked(SampleModel.countDocuments).mockResolvedValueOnce(1);

    // Requête avec un filtre (style=LoFi), ce qui force l'interrogation de la base
    const req = new NextRequest('http://localhost/api/samplotek/search?style=LoFi');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);

    // Vérification stricte des filtres de sécurité injectés dans la query
    expect(SampleModel.find).toHaveBeenCalledWith(expect.objectContaining({
      style: 'LoFi',
      status: 'PUBLISHED',
      'moderation.isQuarantined': false // 🛡️ Le public ne doit pas voir les éléments signalés
    }));
    expect(getCachedSamples).not.toHaveBeenCalled();
  });

  it('🟢 [STUDIO PRIVÉ] doit autoriser un auteur à voir ses propres brouillons et samples en quarantaine', async () => {
    // Connexion en tant qu'oiseau_123
    (global as any).__mockUser = { uid: 'oiseau_123', capabilities: [] };

    mockLean.mockResolvedValueOnce([{ uid: 's2', status: 'DRAFT' }]);
    vi.mocked(SampleModel.countDocuments).mockResolvedValueOnce(1);

    // L'oiseau filtre sur son propre Studio
    const req = new NextRequest('http://localhost/api/samplotek/search?authorUid=oiseau_123');
    const res = await GET(req, { params: Promise.resolve({}) });
    
    expect(res.status).toBe(200);

    // Vérification que les filtres de modération (PUBLISHED, isQuarantined) SONT ABSENTS
    expect(SampleModel.find).toHaveBeenCalledWith({
      authorUid: 'oiseau_123'
      // 🔓 Pas de status forcé, pas de quarantaine cachée
    });
  });

  it('🟢 [PAGINATION] doit appliquer correctement les limites (max 100) et le skip', async () => {
    mockLean.mockResolvedValueOnce([]);
    vi.mocked(SampleModel.countDocuments).mockResolvedValueOnce(500);

    // Requête demandant la page 3 avec une limite absurde de 999
    const req = new NextRequest('http://localhost/api/samplotek/search?style=Ambient&page=3&limit=999');
    await GET(req, { params: Promise.resolve({}) });

    // La limite a dû être plafonnée à 100. Donc page 3 = skip de 200.
    expect(mockSkip).toHaveBeenCalledWith(200); 
    expect(mockLimit).toHaveBeenCalledWith(100);
  });
});