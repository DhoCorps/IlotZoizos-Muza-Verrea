import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/teams/[slug]/respond/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, connectToDatabase, getNeo4jSession } from '@ilot/infrastructure';
import { TransactionManager } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
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
  ProjectModel: {
    find: vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
  },
  TaskModel: {
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => (key === 'caps' ? ['READ'] : null),
      }],
    }),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@ilot/shared-core', () => ({
  TransactionManager: {
    execute: vi.fn(),
  },
}));

describe('Team Respond Slug API [POST]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/team/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('non identifié');
  });

  it('devrait retourner 400 si l action est invalide', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1' },
    } as any);

    const req = new Request('http://localhost/api/team/mon-nid/respond', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVALID_ACTION' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Mouvement invalide');
  });

  it('devrait réussir (200) l acceptation du pacte en appliquant le slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1' },
    } as any);

    const mockTeam = { uid: 'team-uid-1', name: 'Nid des Ailes' };
    vi.mocked(TeamModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce(mockTeam),
    } as any);

    vi.mocked(TransactionManager.execute).mockImplementation(async (name: string, callback: any) => {
      return await callback({} as any, { run: vi.fn().mockResolvedValue({ records: [1] }) } as any);
    });

    const req = new Request('http://localhost/api/team/Mon Super Nid!/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ACCEPT' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Pacte signé');
    expect(TeamModel.findOne).toHaveBeenCalledWith({
      $or: [{ slug: 'mon-super-nid' }, { uid: 'mon-super-nid' }],
    });
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
  });
});