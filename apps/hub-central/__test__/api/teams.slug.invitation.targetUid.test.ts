import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/teams/[slug]/invitations/[targetUid]/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
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
    execute: vi.fn(async (_label, callback) => {
      const mockMongoSession = {};
      const mockNeoTx = { run: vi.fn().mockResolvedValue({ records: [1] }) };
      return await callback(mockMongoSession, mockNeoTx);
    }),
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Révocation d\'invitation (DELETE /api/teams/[slug]/invitations/[targetUid])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/teams/mon-nid/invitations/target-123', {
      method: 'DELETE',
    });

    const response = await DELETE(req as any, { 
      params: Promise.resolve({ slug: 'mon-nid', targetUid: 'target-123' }) 
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (403) si l\'utilisateur n\'est ni propriétaire du Nid ni Architecte', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'simple-user', capabilities: [] }
    } as any);

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid',
      ownerUid: 'other-owner'
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/invitations/target-123', {
      method: 'DELETE',
    });

    const response = await DELETE(req as any, { 
      params: Promise.resolve({ slug: 'mon-nid', targetUid: 'target-123' }) 
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toContain("Aura insuffisante");
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');
  });

  it('doit réussir (200) la révocation si l\'utilisateur est le propriétaire du Nid et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'owner-uid', capabilities: [] }
    } as any);

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 'mon-nid',
      ownerUid: 'owner-uid'
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/invitations/target-123', {
      method: 'DELETE',
    });

    const response = await DELETE(req as any, { 
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