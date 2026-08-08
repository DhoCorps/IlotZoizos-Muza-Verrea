import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/letrin/sprites/[slug]/route';
import { LetterSpriteModel } from '@ilot/infrastructure';
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

const mockLean = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  LetterSpriteModel: {
    findOne: vi.fn(() => ({ lean: mockLean })),
    findOneAndUpdate: vi.fn(() => ({ lean: mockLean })),
    findOneAndDelete: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Letr\'In Sprite Slug - Gestion d\'une police spécifique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // =========================================================================
  // 🔍 TESTS GET (Consultation)
  // =========================================================================
  describe('GET /api/letrin/sprites/[slug]', () => {
    it('doit renvoyer une erreur 404 si la police est introuvable', async () => {
      mockLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/letrin/sprites/inconnue');
      const context = { params: Promise.resolve({ slug: 'inconnue' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain("Police introuvable");
    });

    it('doit renvoyer la police avec succès (200)', async () => {
      mockLean.mockResolvedValueOnce({ slug: 'cyberfont', name: 'CyberFont' });

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
    it('doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/letrin/sprites/cyberfont', {
        method: 'PUT',
        body: JSON.stringify({ name: 'CyberFont V2' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberfont' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(401);
    });

    it('doit muter la police avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      mockLean.mockResolvedValueOnce({ slug: 'cyberfont', name: 'CyberFont V2' });

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
    it('doit dissoudre la police avec succès (200) et purger le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      vi.mocked(LetterSpriteModel.findOneAndDelete).mockResolvedValueOnce({ slug: 'cyberfont' } as any);

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