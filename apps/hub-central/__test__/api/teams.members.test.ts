import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/teams/[slug]/members/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockConnectToDatabase = vi.fn().mockResolvedValue(true);
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args)
}));

const mockInviteBird = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    inviteBird: mockInviteBird
  }))
}));

describe('API Teams - Recrutement / Membres du Nid (/api/teams/[slug]/members)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'team_nest_slug_42' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVITE', userUid: 'bird_target' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('🔴 doit rejeter si le corps de requête est illisible ou vide (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_owner', capabilities: ['*'] }
    } as any);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: '{ broken_json '
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("L'onde est muette");
  });

  it('🔴 doit rejeter si l’action n’est pas "INVITE" (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_owner', capabilities: ['*'] }
    } as any);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'KICK', userUid: 'bird_target' })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Mouvement inconnu");
  });

  it('🔴 doit rejeter si l’UID de l’oiseau cible est manquant (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_owner', capabilities: ['*'] }
    } as any);

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'INVITE' }) // Pas de userUid
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("UID de l'oiseau cible est manquant");
  });

  it('🟢 doit inviter l’oiseau avec succès dans le Nid via son slug (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_owner', capabilities: ['*'] }
    } as any);

    mockInviteBird.mockResolvedValueOnce({ success: true, message: 'Invitation transmise' });

    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({
        action: 'INVITE',
        userUid: 'bird_target_99',
        capabilities: ['task:create']
      })
    });

    const res = await POST(req as any, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockInviteBird).toHaveBeenCalledWith(
      {
        teamUid: 'team_nest_slug_42',
        targetUserUid: 'bird_target_99',
        capabilities: ['task:create']
      },
      expect.objectContaining({
        actorUid: 'bird_owner',
        capabilities: ['*']
      })
    );
  });
});