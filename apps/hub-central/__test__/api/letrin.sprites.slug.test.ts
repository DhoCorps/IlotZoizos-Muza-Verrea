import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/letrin/sprites/[slug]/route';
import { LetrinFontSpriteModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

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
    LetrinFontSpriteModel: {
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

  describe('GET /api/letrin/sprites/[slug]', () => {
    it('doit renvoyer une erreur 404 si la police est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost/api/letrin/sprites/inconnue');
      const context = { params: Promise.resolve({ slug: 'inconnue' }) };

      const res = await GET(req, context);
      const json = await res.json();

      expect(res.status).toBe(404);
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

  describe('PUT /api/letrin/sprites/[slug]', () => {
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

    it('🟢 doit muter la police (y compris catégorie, tags, fréquence) avec succès et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', name: 'CyberFont', authorUid: 'bird_1' 
      });
      
      mockLean.mockResolvedValueOnce({ uid: 's_1', slug: 'cyberfont', name: 'CyberFont V2', category: 'GOTHIQUE', frequencyHz: 396, authorUid: 'bird_1' });

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'CyberFont V2', category: 'GOTHIQUE', frequencyHz: 396, tags: ['sombre'] })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.category).toBe('GOTHIQUE');
      expect(revalidateTag).toHaveBeenCalledWith('fonts');
      expect(revalidateTag).toHaveBeenCalledWith('letrin');
      expect(revalidateTag).toHaveBeenCalledWith('font-cyberfont');
    });

    it('🔴 doit rejeter (400) si la catégorie de mutation est invalide', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ category: 'INVENTEE' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req, context);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/letrin/sprites/[slug]', () => {
    it('🟢 doit dissoudre la police avec succès (200) et purger le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_1' 
      });
      
      vi.mocked(LetrinFontSpriteModel.findOneAndDelete).mockResolvedValueOnce({ 
        uid: 's_1', slug: 'cyberfont', authorUid: 'bird_1' 
      } as unknown as Awaited<ReturnType<typeof LetrinFontSpriteModel.findOneAndDelete>>);

      const req = new NextRequest('http://localhost/api/letrin/sprites/cyberfont', { method: 'DELETE' });
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