import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/kontakt/templates/[slug]/route';
import { CVTemplateModel } from '@ilot/infrastructure';
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
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

const mockLean = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  CVTemplateModel: {
    findOne: vi.fn(() => ({ lean: mockLean })),
    findOneAndUpdate: vi.fn(() => ({ lean: mockLean })),
    findOneAndDelete: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Kontakt Template Slug - Gestion d\'un template spécifique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  // =========================================================================
  // 📖 TESTS GET (Consultation)
  // =========================================================================
  describe('GET /api/kontakt/templates/[slug]', () => {
    it('doit renvoyer une erreur 404 si le template est introuvable', async () => {
      mockLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/kontakt/templates/inconnu');
      const context = { params: Promise.resolve({ slug: 'inconnu' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Parchemin introuvable');
    });

    it('doit renvoyer le template avec succès (200)', async () => {
      mockLean.mockResolvedValueOnce({ slug: 'cyberpunk', title: 'Template Cyberpunk' });

      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk');
      const context = { params: Promise.resolve({ slug: 'cyberpunk' }) };

      const res = await GET(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.slug).toBe('cyberpunk');
    });
  });

  // =========================================================================
  // ✍️ TESTS PUT (Mutation)
  // =========================================================================
  describe('PUT /api/kontakt/templates/[slug]', () => {
    it('doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      delete (global as any).__mockUser;

      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Muté' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberpunk' }) };

      const res = await PUT(req as any, context);
      expect(res.status).toBe(401);
    });

    it('doit muter le template avec succès (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      mockLean.mockResolvedValueOnce({ slug: 'cyberpunk', title: 'Muté' });

      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Muté' })
      });
      const context = { params: Promise.resolve({ slug: 'cyberpunk' }) };

      const res = await PUT(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('cv-templates');
      expect(revalidateTag).toHaveBeenCalledWith('kontakt-templates');
      expect(revalidateTag).toHaveBeenCalledWith('template-cyberpunk');
    });
  });

  // =========================================================================
  // 🧨 TESTS DELETE (Suppression)
  // =========================================================================
  describe('DELETE /api/kontakt/templates/[slug]', () => {
    it('doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
      delete (global as any).__mockUser;

      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberpunk' }) };

      const res = await DELETE(req as any, context);
      expect(res.status).toBe(401);
    });

    it('doit dissoudre le template avec succès (200) et purger le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      vi.mocked(CVTemplateModel.findOneAndDelete).mockResolvedValueOnce({ slug: 'cyberpunk' } as any);

      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: 'cyberpunk' }) };

      const res = await DELETE(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('cv-templates');
      expect(revalidateTag).toHaveBeenCalledWith('kontakt-templates');
      expect(revalidateTag).toHaveBeenCalledWith('template-cyberpunk');
    });
  });
});