import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/teams/[slug]/invitations/[targetUid]/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, TeamModel } from '@ilot/infrastructure';
import { TransactionManager } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: { findOne: vi.fn() },
}));

vi.mock('@ilot/shared-core', () => ({
  TransactionManager: {
    execute: vi.fn(),
  },
}));

describe('Team Invitation DELETE API [slug] [targetUid]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const res = await DELETE({} as Request, { 
      params: Promise.resolve({ slug: 'mon-nid', targetUid: 'oiseau-123' }) 
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Oiseau non identifié.');
  });

  it('devrait réussir (200) et révoquer l invitation en utilisant le slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'owner-bird' },
    } as any);

    vi.mocked(TeamModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce({ uid: 'team-uid-1', ownerUid: 'owner-bird' }),
    } as any);

    // Mock du callback transactionnel
    vi.mocked(TransactionManager.execute).mockImplementation(async (name: string, callback: any) => {
      return await callback({} as any, { run: vi.fn().mockResolvedValue({ records: [1] }) } as any);
    });

    const res = await DELETE({} as Request, { 
      params: Promise.resolve({ slug: 'Mon Super Nid!', targetUid: 'oiseau-123' }) 
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(TeamModel.findOne).toHaveBeenCalledWith({
      $or: [{ slug: 'mon-super-nid' }, { uid: 'mon-super-nid' }]
    });
  });

  it('devrait retourner 403 si l oiseau n est pas propriétaire ou architecte', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'other-bird', capabilities: [] },
    } as any);

    vi.mocked(TeamModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce({ uid: 'team-uid-1', ownerUid: 'owner-bird' }),
    } as any);

    const res = await DELETE({} as Request, { 
      params: Promise.resolve({ slug: 'mon-nid', targetUid: 'oiseau-123' }) 
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Aura insuffisante');
  });
});