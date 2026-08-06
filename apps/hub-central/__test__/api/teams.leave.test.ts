import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/teams/[slug]/leave/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockConnectToDatabase = vi.fn().mockResolvedValue(true);
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args)
}));

const mockLeaveTeam = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    leaveTeam: mockLeaveTeam
  }))
}));

describe('API Teams - Envol Volontaire (/api/teams/[slug]/leave)', () => {
  // 🪡 SUTURE : On utilise désormais 'slug' dans les params de test
  const mockParams = { params: Promise.resolve({ slug: 'team_nest_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN' })
    });

    const res = await POST(req as any, mockParams);
    expect(res.status).toBe(401);
  });

  it('🟢 doit exécuter l’envol volontaire via slug avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_1', capabilities: [] }
    } as any);

    mockLeaveTeam.mockResolvedValueOnce({ success: true, message: 'Envol réussi' });

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ mode: 'CLEAN' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockLeaveTeam).toHaveBeenCalledWith(
      'team_nest_1', 
      'bird_1', 
      'CLEAN', 
      expect.any(Object)
    );
  });
});