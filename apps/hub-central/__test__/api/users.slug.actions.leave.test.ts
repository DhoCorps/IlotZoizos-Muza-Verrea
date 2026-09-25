// Fichier : apps/hub-central/__test__/api/users.leave.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/[slug]/actions/leave/route';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/cache/users.cache', () => ({
  getCachedOiseau: vi.fn().mockResolvedValue(null),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    OiseauModel: {
      findOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// Mock unifié de l'api-guard pour simuler les sessions optionnelles et strictes
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    return await handler(req, context, mockCurrentUser);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    if (!mockCurrentUser) {
      return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockCurrentUser);
  },
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

describe('Route API : Miroir, Envol & SSOT CV (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TeamOrchestrator
    vi.spyOn(TeamOrchestrator.prototype, 'leaveTeam').mockResolvedValue({
      success: true,
      message: "Envol réussi.",
    } as unknown as Awaited<ReturnType<TeamOrchestrator['leaveTeam']>>);
  });

  const mockOiseauDb = {
    uid: 'dho',
    slug: 'dho',
    pseudo: 'DhÖ',
    email: 'secret@zoizos.fr',
    frequenceHEX: '#8b9dc3',
    cvProfile: {
      professionalStatus: 'FREELANCE',
      experiences: [
        { title: 'Architecte Canopée', isVisibleInCv: true },
        { title: 'Expérience Secrète', isVisibleInCv: false }
      ],
      educations: []
    }
  };

  describe('GET - Miroir & Profil CV', () => {
    it('doit renvoyer les données privées et le cvProfile complet si c\'est le propriétaire', async () => {
      global.__mockUser = { uid: 'dho', capabilities: [] };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as any);

      const req = new NextRequest('http://localhost/api/users/dho');
      const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.email).toBe('secret@zoizos.fr');
      expect(json.cvProfile.experiences.length).toBe(2); // Le propriétaire voit tout
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
    });

    it('doit masquer l\'email et filtrer les expériences non visibles pour un visiteur anonyme', async () => {
      delete global.__mockUser;
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as any);

      const req = new NextRequest('http://localhost/api/users/dho');
      const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.email).toBeUndefined();
      expect(json.cvProfile.experiences.length).toBe(1); // Filtré (isVisibleInCv: false retiré)
      expect(json.cvProfile.experiences[0].title).toBe('Architecte Canopée');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
    });
  });

  describe('POST - Envol', () => {
    it('doit rejeter (403) si l\'utilisateur tente de forcer l\'exil d\'un autre', async () => {
      global.__mockUser = { uid: 'intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'dho',
        slug: 'dho'
      } as any);

      const req = new NextRequest('http://localhost/api/users/dho', {
        method: 'POST',
        body: JSON.stringify({ mode: 'CLEAN', teamId: 't-1' }),
      });

      const response = await POST(req, { params: Promise.resolve({ slug: 'dho' }) });
      expect(response.status).toBe(403);
    });

    it('doit réussir (200) l\'envol et invalider le cache', async () => {
      global.__mockUser = { uid: 'dho', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'dho',
        slug: 'dho'
      } as any);

      const req = new NextRequest('http://localhost/api/users/dho', {
        method: 'POST',
        body: JSON.stringify({ mode: 'CLEAN', teamId: 't-1' }),
      });

      const response = await POST(req, { params: Promise.resolve({ slug: 'dho' }) });
      
      expect(response.status).toBe(200);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
      expect(revalidateTag).toHaveBeenCalledWith('profile-dho');
    });
  });
});