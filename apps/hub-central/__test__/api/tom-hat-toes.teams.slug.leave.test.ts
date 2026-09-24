import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tom-hat-toes/teams/[slug]/leave/route';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser) {
      return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    TeamModel: {
      findOne: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
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
describe('Route API : Envol volontaire d\'un Nid (POST /api/tom-hat-toes/teams/[slug]/leave)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TeamOrchestrator
    vi.spyOn(TeamOrchestrator.prototype, 'leaveTeam').mockResolvedValue({
      success: true,
      message: "L'oiseau a pris son envol avec succès.",
    } as unknown as Awaited<ReturnType<TeamOrchestrator['leaveTeam']>>);
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si le protocole mémoriel (mode) est absent ou invalide', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'INVALID_MODE' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("protocole mémoriel valide");
  });

  it('doit réussir (200) l\'envol avec le protocole CLEAN, exécuter l\'orchestrateur et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');

    // 💥 Vérification de l'invalidation chirurgicale du cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('teams');
    expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
    expect(revalidateTag).toHaveBeenCalledWith('teams-u-123');
    expect(revalidateTag).toHaveBeenCalledWith('profile-u-123');
  });
});