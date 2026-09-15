import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '@/app/api/letrin/fonts/[slug]/route';
import { FontProject, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
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
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    FontProject: {
      findOneAndUpdate: vi.fn(() => ({ lean: mockLean })),
      findOneAndDelete: vi.fn(),
    },
    // 🛡️ MOCK SIMPLIFIÉ : On le contrôlera directement dans les tests !
    findEntityBySlugOrUid: vi.fn(),
  };
});

declare global {
  var __mockUser: any;
}

describe('API Letr\'In Font Project Slug - Gestion d\'un projet spécifique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  // =========================================================================
  // 🚀 TESTS PUT (Mutation)
  // =========================================================================
  describe('PUT /api/letrin/fonts/[slug]', () => {
    it('🔴 doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      delete (global as any).__mockUser;

      const req = new Request('http://localhost/api/letrin/fonts/matrix-font', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Matrix Font V2' })
      });
      const context = { params: Promise.resolve({ slug: 'matrix-font' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter (403) si l\'oiseau n\'est ni l\'auteur ni un Architecte', async () => {
      global.__mockUser = { uid: 'intrus', capabilities: [] };
      
      // ✨ On mock directement la résolution de l'entité
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 'f_1', slug: 'matrix-font', name: 'Matrix Font', authorUid: 'bird_owner' 
      } as any);

      const req = new Request('http://localhost/api/letrin/fonts/matrix-font', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hack' })
      });
      const context = { params: Promise.resolve({ slug: 'matrix-font' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(403);
    });

    it('🟢 doit muter le projet avec succès (200) si l\'oiseau est l\'auteur et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      // ✨ 1er appel: la vérification des droits (findEntityBySlugOrUid)
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 'f_1', slug: 'matrix-font', name: 'Matrix Font', authorUid: 'bird_1' 
      } as any);
      
      // L'update mongo
      mockLean.mockResolvedValueOnce({ 
        uid: 'f_1', slug: 'matrix-font', name: 'Matrix Font V2', authorUid: 'bird_1' 
      });

      const req = new Request('http://localhost/api/letrin/fonts/matrix-font', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Matrix Font V2' })
      });
      const context = { params: Promise.resolve({ slug: 'matrix-font' }) };

      const res = await PUT(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('fonts');
      expect(revalidateTag).toHaveBeenCalledWith('font-projects');
      expect(revalidateTag).toHaveBeenCalledWith('font-matrix-font');
    });

    it('🔴 doit renvoyer 404 si le projet est introuvable à la mutation', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      // ✨ Si le helper unifié ne trouve rien
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/letrin/fonts/inconnu', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Inconnu' })
      });
      const context = { params: Promise.resolve({ slug: 'inconnu' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 🗑️ TESTS DELETE (Dissolution)
  // =========================================================================
  describe('DELETE /api/letrin/fonts/[slug]', () => {
    it('🔴 doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      delete (global as any).__mockUser;

      const req = new Request('http://localhost/api/letrin/fonts/matrix-font', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'matrix-font' }) };

      const res = await DELETE(req as any, context);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter (403) si l\'oiseau tente de dissoudre un projet qui ne lui appartient pas', async () => {
      global.__mockUser = { uid: 'intrus', capabilities: [] };
      
      // ✨ Mock unifié
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 'f_1', slug: 'matrix-font', authorUid: 'bird_owner' 
      } as any);

      const req = new Request('http://localhost/api/letrin/fonts/matrix-font', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'matrix-font' }) };

      const res = await DELETE(req as any, context);
      expect(res.status).toBe(403);
    });

    it('🟢 doit dissoudre le projet avec succès (200) et purger le cache si l\'oiseau est l\'auteur', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      // ✨ Mock unifié
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 'f_1', slug: 'matrix-font', authorUid: 'bird_1' 
      } as any);
      
      vi.mocked(FontProject.findOneAndDelete).mockResolvedValueOnce({ 
        uid: 'f_1', slug: 'matrix-font', authorUid: 'bird_1' 
      } as any);

      const req = new Request('http://localhost/api/letrin/fonts/matrix-font', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'matrix-font' }) };

      const res = await DELETE(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('fonts');
      expect(revalidateTag).toHaveBeenCalledWith('font-projects');
      expect(revalidateTag).toHaveBeenCalledWith('font-matrix-font');
    });
  });
});