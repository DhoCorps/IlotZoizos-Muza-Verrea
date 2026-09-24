import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/tom-hat-toes/teams/[slug]/invitations/[targetUid]/route';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '@ilot/shared-core';
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

vi.mock('@ilot/shared-core', () => ({
  TransactionManager: {
    execute: vi.fn(async (_label: string, callback: Function) => {
      const mockMongoSession = {};
      const mockNeoTx = { run: vi.fn().mockResolvedValue({ records: [1] }) };
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
describe('Route API : Révocation d\'invitation (DELETE /api/tom-hat-toes/teams/[slug]/invitations/[targetUid])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid/invitations/target-123', {
      method: 'DELETE',
    });

    const response = await DELETE(req, { 
      params: Promise.resolve({ slug: 'mon-nid', targetUid: 'target-123' }) 
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (403) si l\'utilisateur n\'est ni propriétaire du Nid ni Architecte', async () => {
    global.__mockUser = { uid: 'simple-user', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid',
      ownerUid: 'other-owner'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid/invitations/target-123', {
      method: 'DELETE',
    });

    const response = await DELETE(req, { 
      params: Promise.resolve({ slug: 'mon-nid', targetUid: 'target-123' }) 
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toContain("Aura insuffisante");
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');
  });

  it('doit réussir (200) la révocation si l\'utilisateur est le propriétaire du Nid et invalider le cache', async () => {
    global.__mockUser = { uid: 'owner-uid', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid',
      ownerUid: 'owner-uid'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid/invitations/target-123', {
      method: 'DELETE',
    });

    const response = await DELETE(req, { 
      params: Promise.resolve({ slug: 'mon-nid', targetUid: 'target-123' }) 
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');

    // 💥 Vérification de l'invalidation de cache en cascade (incluant l'équipe et le targetUid)
    expect(revalidateTag).toHaveBeenCalledWith('teams');
    expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
    expect(revalidateTag).toHaveBeenCalledWith('teams-target-123');
  });
});