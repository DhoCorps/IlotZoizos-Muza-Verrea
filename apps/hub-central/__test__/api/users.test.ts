// Fichier : apps/hub-central/__test__/api/users.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/route';
import { OiseauModel } from '@ilot/infrastructure';
import { getCachedOiseaux } from '@/lib/cache/users.cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/cache/users.cache', () => ({
  getCachedOiseaux: vi.fn().mockResolvedValue([{ uid: '123', pseudo: 'Alpha' }]),
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

// Mock unifié des api-guards
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
describe('Route API : Volière Publique & Filtres RH (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
    // Ré-affirmation explicite de la valeur résolue pour le cache
    vi.mocked(getCachedOiseaux).mockResolvedValue([{ uid: '123', pseudo: 'Alpha' }] as any);
  });

  describe('GET - Recensement et Filtres RH', () => {
    it('doit rejeter (401) si l\'Oiseau n\'a pas d\'Aura', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/users');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit transmettre les paramètres de recherche et les filtres RH à getCachedOiseaux', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      const req = new NextRequest('http://localhost/api/users?search=Alpha&professionalStatus=FREELANCE&remotePreference=FULL_REMOTE&maxRate=500');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual([{ uid: '123', pseudo: 'Alpha' }]);
      
      // Vérification que les filtres de recherche et RH ont bien été extraits et passés au cache
      expect(getCachedOiseaux).toHaveBeenCalledWith({
        search: 'Alpha',
        professionalStatus: 'FREELANCE',
        remotePreference: 'FULL_REMOTE',
        maxRate: 500
      });
    });
  });

  describe('POST - Éclosion', () => {
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
  });
});