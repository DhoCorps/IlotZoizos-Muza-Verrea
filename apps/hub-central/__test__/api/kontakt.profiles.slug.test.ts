import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/kontakt/profiles/[slug]/route';
import { KontaktProfileModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser || { uid: 'bird_owner', capabilities: [] };
    if (!mockUser.uid) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({ slugify: vi.fn((val) => val) }));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    KontaktProfileModel: {
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

declare global {
  var __mockUser: any;
}

describe('API Kontakt Profiles [slug] - GET, PUT, DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  describe('GET - Auscultation du Profil', () => {
    it('🟢 doit renvoyer (200) le profil avec succès', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'kontakt_1',
        slug: 'dev-matrix',
        professionalTitle: 'Dev Matrix'
      } as any);

      const req = new Request('http://localhost/api/kontakt/profiles/dev-matrix');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'dev-matrix' }) } as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.uid).toBe('kontakt_1');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(KontaktProfileModel, 'dev-matrix');
    });

    it('🔴 doit renvoyer (404) si le profil est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/kontakt/profiles/inconnu');
      const res = await GET(req as any, { params: Promise.resolve({ slug: 'inconnu' }) } as any);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('introuvable');
    });
  });

  describe('PUT - Mutation du Profil', () => {
    it('🔴 doit refuser (403) si l\'oiseau n\'est ni le propriétaire ni un Architecte', async () => {
      global.__mockUser = { uid: 'bird_intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'kontakt_1',
        slug: 'dev-matrix',
        userUid: 'bird_owner'
      } as any);

      const req = new Request('http://localhost/api/kontakt/profiles/dev-matrix', {
        method: 'PUT',
        body: JSON.stringify({ professionalTitle: 'Hacked' })
      });

      const res = await PUT(req as any, { params: Promise.resolve({ slug: 'dev-matrix' }) } as any);
      expect(res.status).toBe(403);
    });

    it('🟢 doit mettre à jour le profil (200) si c\'est le propriétaire', async () => {
      global.__mockUser = { uid: 'bird_owner', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid)
        .mockResolvedValueOnce({ uid: 'kontakt_1', slug: 'dev-matrix', userUid: 'bird_owner' } as any) // Pour cibler le profil
        .mockResolvedValueOnce(null); // Pour la vérification de collision de slug

      vi.mocked(KontaktProfileModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'kontakt_1', slug: 'nouveau-titre', professionalTitle: 'Nouveau Titre' })
      } as any);

      const req = new Request('http://localhost/api/kontakt/profiles/dev-matrix', {
        method: 'PUT',
        body: JSON.stringify({ professionalTitle: 'Nouveau Titre' })
      });

      const res = await PUT(req as any, { params: Promise.resolve({ slug: 'dev-matrix' }) } as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(KontaktProfileModel.findOneAndUpdate).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
    });
  });

  describe('DELETE - Dissolution du Profil', () => {
    it('🟢 doit dissoudre le profil (200) et invalider les caches', async () => {
      global.__mockUser = { uid: 'bird_owner', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'kontakt_1',
        slug: 'dev-matrix',
        userUid: 'bird_owner'
      } as any);

      vi.mocked(KontaktProfileModel.deleteOne).mockResolvedValueOnce({ deletedCount: 1 } as any);

      const req = new Request('http://localhost/api/kontakt/profiles/dev-matrix', { method: 'DELETE' });
      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'dev-matrix' }) } as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(KontaktProfileModel.deleteOne).toHaveBeenCalledWith({ uid: 'kontakt_1' });
      expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
      expect(revalidateTag).toHaveBeenCalledWith('kontakt-profile-dev-matrix');
    });
  });
});