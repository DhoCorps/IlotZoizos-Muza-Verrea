import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/recruitable/route';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Laisse passer pour tester la logique
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  OiseauOrchestrator: vi.fn().mockImplementation(() => ({
    fosterOiseau: vi.fn(),
  })),
}));

// Mock unifié de l'api-guard avec NextResponse
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    if (!mockCurrentUser) {
      return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockCurrentUser);
  },
  withSilice: (handler: Function) => handler,
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Volière Publique (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  describe('GET - Recensement', () => {
    it('doit rejeter (401) si l\'utilisateur n\'est pas connecté (pas d\'Aura)', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/users');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit renvoyer (200) la liste des oiseaux filtrés pour un utilisateur connecté', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };
      
      const mockOiseaux = [{ uid: '123', pseudo: 'Alpha' }];
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOiseaux),
      };
      vi.mocked(OiseauModel.find).mockReturnValue(chainMock as unknown as ReturnType<typeof OiseauModel.find>);

      const req = new NextRequest('http://localhost/api/users?search=Alpha');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual(mockOiseaux);
      expect(OiseauModel.find).toHaveBeenCalledWith(expect.objectContaining({
        $or: expect.any(Array)
      }));
    });
  });

  describe('POST - Éclosion (Inscription)', () => {
    it('doit rejeter (400) si l\'oeuf est incomplet', async () => {
      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@mail.com' }), // Manque pseudo et password
      });

      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain("L'oeuf est incomplet");
    });

    it('doit rejeter (409) si l\'email ou le pseudo existe déjà', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'existing' }),
      } as unknown as ReturnType<typeof OiseauModel.findOne>);

      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'clone@mail.com', pseudo: 'Clone', password: '123' }),
      });

      const response = await POST(req, { params: Promise.resolve({}) });
      expect(response.status).toBe(409);
    });

    it('doit créer l\'Oiseau (201) et invalider le cache de la volière', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as unknown as ReturnType<typeof OiseauModel.findOne>);

      const mockFoster = vi.fn().mockResolvedValue({ uid: 'new-uid', slug: 'new-slug' });
      vi.mocked(OiseauOrchestrator).mockImplementation(() => ({ fosterOiseau: mockFoster } as unknown as OiseauOrchestrator));

      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@mail.com', pseudo: 'NewBird', password: '123' }),
      });

      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.uid).toBe('new-uid');
      
      // Vérification cruciale de l'invalidation du cache de la volière
      expect(revalidateTag).toHaveBeenCalledWith('users');
      expect(mockFoster).toHaveBeenCalledWith(expect.objectContaining({ pseudo: 'NewBird' }));
    });
  });
});