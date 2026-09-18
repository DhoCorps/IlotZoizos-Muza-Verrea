import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/teams/[slug]/respond/route';
import { TeamModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
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
    OiseauModel: {
      findOneAndUpdate: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@ilot/shared-core', () => ({
  TransactionManager: {
    execute: vi.fn(async (_label: string, callback: Function) => {
      const mockMongoSession = {};
      const mockNeoTx = { run: vi.fn().mockResolvedValue(true) };
      return await callback(mockMongoSession, mockNeoTx);
    }),
  },
}));

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
describe('Route API : Réponse au Pacte d\'Adhésion (POST /api/teams/[slug]/respond)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/teams/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (404) si aucune invitation n\'existe pour cet oiseau sur ce nid', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid',
      name: 'Nid'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    // Neo4j renvoie 0 enregistrement (pas d'INVITED_TO)
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true),
    } as unknown as ReturnType<typeof getNeo4jSession>);

    const req = new NextRequest('http://localhost/api/teams/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(404); // 🛡️ Vérification du passage au code 404 sémantique
    expect(json.error).toContain("Souveraineté violée");
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');
  });

  it('doit réussir (200) l\'acceptation du pacte, exécuter la transaction et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid',
      name: 'Nid Céleste'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    // Neo4j trouve bien l'invitation
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({
        records: [{ get: (k: string) => k === 'caps' ? ['READ'] : [] }]
      }),
      close: vi.fn().mockResolvedValue(true),
    } as unknown as ReturnType<typeof getNeo4jSession>);

    const req = new NextRequest('http://localhost/api/teams/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const response = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain("Pacte signé");
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');

    // 💥 Vérification de l'invalidation chirurgicale du cache
    expect(revalidateTag).toHaveBeenCalledWith('teams-u-123');
    expect(revalidateTag).toHaveBeenCalledWith('teams');
    expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
    expect(revalidateTag).toHaveBeenCalledWith('team-t-1');
  });
});