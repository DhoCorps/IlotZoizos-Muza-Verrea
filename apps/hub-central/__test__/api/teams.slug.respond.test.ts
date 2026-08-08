import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/teams/[slug]/respond/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, OiseauModel, getNeo4jSession } from '@ilot/infrastructure';
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

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: {
    findOne: vi.fn(),
  },
  OiseauModel: {
    findOneAndUpdate: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

vi.mock('@ilot/shared-core', () => ({
  TransactionManager: {
    execute: vi.fn(async (label, callback) => {
      // Exécute directement la callback transactionnelle simulée
      const mockMongoSession = {};
      const mockNeoTx = { run: vi.fn().mockResolvedValue(true) };
      return await callback(mockMongoSession, mockNeoTx);
    }),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Réponse au Pacte d\'Adhésion (POST /api/teams/[slug]/respond)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/teams/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (451) si aucune invitation n\'existe pour cet oiseau sur ce nid', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    vi.mocked(TeamModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 't-1', slug: 'mon-nid', name: 'Nid' }),
    } as any);

    // Neo4j renvoie 0 enregistrement (pas d'INVITED_TO)
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true),
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(451);
    expect(json.error).toContain("Souveraineté violée");
  });

  it('doit réussir (200) l\'acceptation du pacte, exécuter la transaction et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    vi.mocked(TeamModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 't-1', slug: 'mon-nid', name: 'Nid Céleste' }),
    } as any);

    // Neo4j trouve bien l'invitation
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({
        records: [{ get: (k: string) => k === 'caps' ? ['READ'] : [] }]
      }),
      close: vi.fn().mockResolvedValue(true),
    } as any);

    const req = new Request('http://localhost/api/teams/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain("Pacte signé");

    // 💥 Vérification de l'invalidation chirurgicale du cache
    expect(revalidateTag).toHaveBeenCalledWith('teams-u-123');
    expect(revalidateTag).toHaveBeenCalledWith('teams');
    expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
  });
});