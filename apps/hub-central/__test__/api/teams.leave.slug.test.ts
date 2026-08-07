import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/teams/[slug]/leave/route';
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
    leaveTeam: vi.fn(),
  })),
}));

describe('Team Leave Slug API [POST]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/team/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('non identifié');
  });

  it('devrait retourner 400 si le mode mémoriel est invalide ou absent', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1', capabilities: [] },
    } as any);

    const req = new Request('http://localhost/api/team/mon-nid/leave', {
      method: 'POST',
      body: JSON.stringify({ mode: 'INVALID_MODE' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('protocole mémoriel valide');
  });

  it('devrait réussir (200) et déclencher l envol en appliquant le slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1', capabilities: [] },
    } as any);

    const mockLeaveTeam = vi.fn().mockResolvedValueOnce({ success: true, message: 'Envole-toi' });
    vi.mocked(TeamOrchestrator).mockImplementationOnce(() => ({
      leaveTeam: mockLeaveTeam,
    } as any));

    const req = new Request('http://localhost/api/team/Mon Super Nid!/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CLEAN' }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockLeaveTeam).toHaveBeenCalledWith(
      'mon-super-nid',
      'user-bird-1',
      'CLEAN',
      { actorUid: 'user-bird-1', capabilities: [] }
    );
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
  });
});