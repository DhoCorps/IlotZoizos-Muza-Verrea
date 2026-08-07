import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/teams/[slug]/members/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    inviteBird: vi.fn(),
  })),
}));

describe('Team Members Slug API [POST]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/team/mon-nid/members', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVITE', userUid: 'target-bird' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('non identifié');
  });

  it('devrait retourner 400 si l action n est pas INVITE', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1', capabilities: [] },
    } as any);

    const req = new Request('http://localhost/api/team/mon-nid/members', {
      method: 'POST',
      body: JSON.stringify({ action: 'UNKNOWN', userUid: 'target-bird' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Mouvement inconnu');
  });

  it('devrait réussir (200) et inviter l oiseau en appliquant le slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1', capabilities: [] },
    } as any);

    const mockInviteBird = vi.fn().mockResolvedValueOnce({ success: true, message: 'Invitation transmise' });
    vi.mocked(TeamOrchestrator).mockImplementationOnce(() => ({
      inviteBird: mockInviteBird,
    } as any));

    const req = new Request('http://localhost/api/team/Mon Super Nid!/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'INVITE', userUid: 'target-bird', capabilities: ['READ'] }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockInviteBird).toHaveBeenCalledWith(
      {
        teamUid: 'mon-super-nid',
        targetUserUid: 'target-bird',
        capabilities: ['READ'],
      },
      { actorUid: 'user-bird-1', capabilities: [] }
    );
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
  });
});