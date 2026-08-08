import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/partita/[slug]/route';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const mockLean = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  PartitaModel: {
    findOne: vi.fn(() => ({ lean: mockLean })),
  },
}));

// 🪡 MOCK PROPRE DE L'ORCHESTRATEUR AVEC DES SPYS EXPLICITES
vi.mock('@ilot/shared-core', () => ({
  PartitaOrchestrator: vi.fn().mockImplementation(() => ({
    updatePartita: vi.fn(),
    disintegratePartita: vi.fn(),
  })),
}));

declare global {
  var __mockUser: any;
}

describe('API Partita Slug - Gestion d\'une Partition Spécifique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // =========================================================================
  // 🔍 TESTS GET (Consultation)
  // =========================================================================
  describe('GET /api/partitas/[slug]', () => {
    it('doit renvoyer une erreur 400 si le slug est invalide ou manquant', async () => {
      const req = new Request('http://localhost/api/partitas/');
      const context = { params: Promise.resolve({ slug: '' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Identifiant invalide");
    });

    it('doit renvoyer une erreur 404 si la partition est introuvable', async () => {
      mockLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/partitas/inconnue');
      const context = { params: Promise.resolve({ slug: 'inconnue' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain("évaporée de la Silice");
    });

    it('doit rejeter (403) si la partition est intime et que l\'acteur n\'est ni l\'auteur ni l\'architecte', async () => {
      mockLean.mockResolvedValueOnce({
        slug: 'sonate-intime',
        status: 'DRAFT',
        authorUid: 'bird_author'
      });

      global.__mockUser = { uid: 'bird_stranger', capabilities: [] };

      const req = new Request('http://localhost/api/partitas/sonate-intime');
      const context = { params: Promise.resolve({ slug: 'sonate-intime' }) };

      const res = await GET(req as any, context);
      expect(res.status).toBe(403);
    });

    it('doit autoriser (200) la lecture d\'une partition publiée par un tiers', async () => {
      mockLean.mockResolvedValueOnce({
        slug: 'sonate-publique',
        status: 'PUBLISHED',
        authorUid: 'bird_author'
      });

      global.__mockUser = { uid: 'bird_reader', capabilities: [] };

      const req = new Request('http://localhost/api/partitas/sonate-publique');
      const context = { params: Promise.resolve({ slug: 'sonate-publique' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.slug).toBe('sonate-publique');
    });
  });

  // =========================================================================
  // 🚀 TESTS PUT (Mutation)
  // =========================================================================
  describe('PUT /api/partitas/[slug]', () => {
    it('doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/partitas/ma-partition', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Nouveau Titre' })
      });
      const context = { params: Promise.resolve({ slug: 'ma-partition' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(401);
    });

    it('doit réussir (200) la mutation via l\'orchestrateur et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };

      const mockUpdatedResult = { uid: 'part_123', success: true, mongo: { title: 'Titre Muté' } };
      
      // 🪡 On mocke directement la méthode sur l'instance mockée de l'Orchestrateur
      const updatePartitaMock = vi.fn().mockResolvedValueOnce(mockUpdatedResult);
      vi.mocked(PartitaOrchestrator).mockImplementationOnce(() => ({
        updatePartita: updatePartitaMock,
        disintegratePartita: vi.fn(),
      } as any));

      const req = new Request('http://localhost/api/partitas/ma-partition', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Titre Muté' })
      });
      const context = { params: Promise.resolve({ slug: 'ma-partition' }) };

      const res = await PUT(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('partitas');
      expect(revalidateTag).toHaveBeenCalledWith('partita-ma-partition');
      expect(revalidateTag).toHaveBeenCalledWith('partita-part_123');
    });
  });

  // =========================================================================
  // 🗑️ TESTS DELETE (Dissolution)
  // =========================================================================
  describe('DELETE /api/partitas/[slug]', () => {
    it('doit dissoudre (200) la partition et purifier le cache', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };

      const disintegrateMock = vi.fn().mockResolvedValueOnce({ success: true, purgedCount: 1, filesToDelete: [] });
      vi.mocked(PartitaOrchestrator).mockImplementationOnce(() => ({
        updatePartita: vi.fn(),
        disintegratePartita: disintegrateMock,
      } as any));

      const req = new Request('http://localhost/api/partitas/partition-a-bruler', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'partition-a-bruler' }) };

      const res = await DELETE(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("réduite en cendres");
      expect(revalidateTag).toHaveBeenCalledWith('partitas');
      expect(revalidateTag).toHaveBeenCalledWith('partita-partition-a-bruler');
    });
  });
});