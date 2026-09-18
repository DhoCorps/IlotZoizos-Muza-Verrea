import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/partita/[slug]/route';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { PartitaModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    PartitaModel: {
      findOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

// Mock du cache de détails de partition
vi.mock('@/lib/cache/partita.cache', () => ({
  getCachedPartitaDetails: vi.fn(async () => {
    return null;
  }),
}));

vi.mock('@ilot/shared-core', () => ({
  PartitaOrchestrator: vi.fn().mockImplementation(() => ({
    updatePartita: vi.fn(),
    disintegratePartita: vi.fn(),
  })),
}));

// 🛡️ Déclaration globale standardisée et alignée
declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('API Partita Slug - Gestion d\'une Partition Spécifique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Consultation)
  // =========================================================================
  describe('GET /api/partita/[slug]', () => {
    it('doit renvoyer une erreur 400 si le slug est invalide ou manquant', async () => {
      const req = new NextRequest('http://localhost/api/partita/');
      const context = { params: Promise.resolve({ slug: '' }) };

      const res = await GET(req, context);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Identifiant invalide");
    });

    it('doit renvoyer une erreur 404 si la partition est introuvable même dans la DB', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost/api/partita/inconnue');
      const context = { params: Promise.resolve({ slug: 'inconnue' }) };

      const res = await GET(req, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain("évaporée de la Silice");
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(PartitaModel, 'inconnue');
    });

    it('doit rejeter (403) si la partition est intime et que l\'acteur n\'est ni l\'auteur ni l\'architecte', async () => {
      global.__mockUser = { uid: 'bird_stranger', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'part_123',
        slug: 'sonate-intime',
        status: 'DRAFT',
        authorUid: 'bird_author'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/partita/sonate-intime');
      const context = { params: Promise.resolve({ slug: 'sonate-intime' }) };

      const res = await GET(req, context);
      expect(res.status).toBe(403);
    });

    it('doit autoriser (200) la lecture d\'une partition publiée par un tiers avec sa théorie via le fallback DB', async () => {
      global.__mockUser = { uid: 'bird_reader', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'part_999',
        slug: 'sonate-publique',
        status: 'PUBLISHED',
        authorUid: 'bird_author',
        theory: { root: 'E', scaleKey: 'HARMONIC_MINOR', score: 100 }
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/partita/sonate-publique');
      const context = { params: Promise.resolve({ slug: 'sonate-publique' }) };

      const res = await GET(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.slug).toBe('sonate-publique');
      expect(json.theory.scaleKey).toBe('HARMONIC_MINOR');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(PartitaModel, 'sonate-publique');
    });
  });

  // =========================================================================
  // 🚀 TESTS PUT (Mutation)
  // =========================================================================
  describe('PUT /api/partita/[slug]', () => {
    it('doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/partita/ma-partition', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Nouveau Titre' })
      });
      const context = { params: Promise.resolve({ slug: 'ma-partition' }) };

      const res = await PUT(req, context);
      expect(res.status).toBe(401);
    });

    it('doit réussir (200) la mutation via l\'orchestrateur avec l\'UID canonique', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'part_canonique_123',
        slug: 'ma-partition'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const mockUpdatedResult = { uid: 'part_canonique_123', slug: 'ma-partition-mut', success: true, title: 'Titre Muté' };
      
      const updatePartitaMock = vi.fn().mockResolvedValueOnce(mockUpdatedResult);
      vi.mocked(PartitaOrchestrator).mockImplementationOnce(() => ({
        updatePartita: updatePartitaMock,
        disintegratePartita: vi.fn(),
      } as unknown as PartitaOrchestrator));

      const req = new NextRequest('http://localhost/api/partita/ma-partition', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Titre Muté' })
      });
      const context = { params: Promise.resolve({ slug: 'ma-partition' }) };

      const res = await PUT(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(PartitaModel, 'ma-partition', expect.any(Object));
      expect(updatePartitaMock).toHaveBeenCalledWith('part_canonique_123', { title: 'Titre Muté' }, expect.any(Object));
      expect(revalidateTag).toHaveBeenCalledWith('partitas');
      expect(revalidateTag).toHaveBeenCalledWith('partita-ma-partition');
      expect(revalidateTag).toHaveBeenCalledWith('partita-part_canonique_123');
    });
  });

  // =========================================================================
  // 🗑️ TESTS DELETE (Dissolution)
  // =========================================================================
  describe('DELETE /api/partita/[slug]', () => {
    it('doit dissoudre (200) la partition avec l\'UID canonique et purifier le cache', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'part_to_burn_99',
        slug: 'partition-a-bruler'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const disintegrateMock = vi.fn().mockResolvedValueOnce({ success: true, purgedCount: 1, filesToDelete: [] });
      vi.mocked(PartitaOrchestrator).mockImplementationOnce(() => ({
        updatePartita: vi.fn(),
        disintegratePartita: disintegrateMock,
      } as unknown as PartitaOrchestrator));

      const req = new NextRequest('http://localhost/api/partita/partition-a-bruler', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'partition-a-bruler' }) };

      const res = await DELETE(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("réduite en cendres");
      
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(PartitaModel, 'partition-a-bruler');
      expect(disintegrateMock).toHaveBeenCalledWith('part_to_burn_99', expect.any(Object));
      
      expect(revalidateTag).toHaveBeenCalledWith('partitas');
      expect(revalidateTag).toHaveBeenCalledWith('partita-partition-a-bruler');
      expect(revalidateTag).toHaveBeenCalledWith('partita-part_to_burn_99');
    });
  });
});