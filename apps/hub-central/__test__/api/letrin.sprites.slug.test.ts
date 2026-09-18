import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/letrin/sprites/[slug]/route';
import { LetterSpriteModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context);
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
    findEntityBySlugOrUid: vi.fn(),
  };
});

describe('API Letr\'In Sprite Slug - Gestion d\'une police spécifique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Consultation)
  // =========================================================================
  describe('GET /api/letrin/sprites/[slug]', () => {
    it('doit renvoyer une erreur 404 si la police est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost/api/letrin/sprites/inconnue');
      const context = { params: Promise.resolve({ slug: 'inconnue' }) };

      const res = await GET(req, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain("Police introuvable");
    });

    it('doit renvoyer la police avec succès (200)', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', name: 'CyberFont' 
      });

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont');
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await GET(req, context);
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
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'CyberFont V2' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req, context);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter (403) si l\'oiseau n\'est ni l\'auteur ni un Architecte', async () => {
      global.__mockUser = { uid: 'intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', name: 'CyberFont', authorUid: 'bird_owner' 
      });

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hack' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req, context);
      expect(res.status).toBe(403);
    });

    it('🟢 doit muter la police avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', name: 'CyberFont', authorUid: 'bird_1' 
      });
      
      mockLean.mockResolvedValueOnce({ uid: 's_1', slug: 'cyberfont', name: 'CyberFont V2', authorUid: 'bird_1' });

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'CyberFont V2' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req, context);
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
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await DELETE(req, context);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter (403) si l\'oiseau tente de dissoudre un sprite qui ne lui appartient pas', async () => {
      global.__mockUser = { uid: 'intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_owner' 
      });

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await DELETE(req, context);
      expect(res.status).toBe(403);
    });

    it('🟢 doit dissoudre la police avec succès (200) et purger le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_1' 
      });
      
      vi.mocked(LetterSpriteModel.findOneAndDelete).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_1' 
      } as unknown as Awaited<ReturnType<typeof LetterSpriteModel.findOneAndDelete>>);

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await DELETE(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('fonts');
      expect(revalidateTag).toHaveBeenCalledWith('letrin');
      expect(revalidateTag).toHaveBeenCalledWith('font-cyberfont');
    });
  });
});