import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/letrin/sprites/[slug]/route';
import { LetterSpriteModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context);
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

vi.mock('@/lib/cache/letrin.cache', () => ({
  getCachedFontDetail: vi.fn().mockResolvedValue(null),
}));

const mockLean = vi.fn();
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    LetterSpriteModel: {
      findOneAndUpdate: vi.fn(() => ({ lean: mockLean })),
      findOneAndDelete: vi.fn(),
    },
    // Mock simplifié et direct pour éviter les problèmes de `lean`
    findEntityBySlugOrUid: vi.fn(),
  };
});

declare global {
  var __mockUser: any;
}

describe('API Letr\'In Sprite Slug - Gestion d\'une police spécifique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Consultation)
  // =========================================================================
  describe('GET /api/letrin/sprites/[slug]', () => {
    it('doit renvoyer une erreur 404 si la police est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/letrin/sprites/inconnue');
      const context = { params: Promise.resolve({ slug: 'inconnue' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain("Police introuvable");
    });

    it('doit renvoyer la police avec succès (200)', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', name: 'CyberFont' 
      } as any);

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont');
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.slug).toBe('cyberfont');
    });
  });

  // =========================================================================
  // 🚀 TESTS PUT (Mutation)
  // =========================================================================
  describe('PUT /api/letrin/sprites/[slug]', () => {
    it('🔴 doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      delete (global as any).__mockUser;

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'CyberFont V2' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter (403) si l\'oiseau n\'est ni l\'auteur ni un Architecte', async () => {
      global.__mockUser = { uid: 'intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', name: 'CyberFont', authorUid: 'bird_owner' 
      } as any);

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hack' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(403);
    });

    it('🟢 doit muter la police avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      // 1er appel: Vérification de souveraineté
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', name: 'CyberFont', authorUid: 'bird_1' 
      } as any);
      
      // Retour de la mutation
      mockLean.mockResolvedValueOnce({ uid: 's_1', slug: 'cyberfont', name: 'CyberFont V2', authorUid: 'bird_1' });

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'CyberFont V2' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('fonts');
      expect(revalidateTag).toHaveBeenCalledWith('letrin');
      expect(revalidateTag).toHaveBeenCalledWith('font-cyberfont');
    });
  });

  // =========================================================================
  // 🗑️ TESTS DELETE (Dissolution)
  // =========================================================================
  describe('DELETE /api/letrin/sprites/[slug]', () => {
    it('🔴 doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      delete (global as any).__mockUser;

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await DELETE(req as any, context);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter (403) si l\'oiseau tente de dissoudre un sprite qui ne lui appartient pas', async () => {
      global.__mockUser = { uid: 'intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_owner' 
      } as any);

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await DELETE(req as any, context);
      expect(res.status).toBe(403);
    });

    it('🟢 doit dissoudre la police avec succès (200) et purger le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_1' 
      } as any);
      
      vi.mocked(LetterSpriteModel.findOneAndDelete).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_1' 
      } as any);

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await DELETE(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('fonts');
      expect(revalidateTag).toHaveBeenCalledWith('letrin');
      expect(revalidateTag).toHaveBeenCalledWith('font-cyberfont');
    });
  });
});