import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from "next-auth/next";
import { GET, POST } from '../../app/api/teams/route';
import { TeamOrchestrator } from '@ilot/shared-core';

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { uid: 'team_1', name: 'Nid Alpha', category: 'SOCIAL', isPrivate: true, ownerUid: 'bird_alpha' }
      ])
    })
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [
        { get: (key: string) => (key === 'teamUid' ? 'team_1' : key === 'relType' ? 'FOUNDED' : []) }
      ]
    }),
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('API Teams / Nids (/api/teams)', () => {
  const mockBirdUid = 'bird_alpha';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser les nids de l\'oiseau authentifié (GET)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: mockBirdUid, capabilities: ['*'] } 
    } as any);

    const req = new Request('http://localhost/api/teams');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].uid).toBe('team_1');
  });

  it('🔴 doit rejeter l\'accès aux étrangers non connectés (GET)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new Request('http://localhost/api/teams');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});