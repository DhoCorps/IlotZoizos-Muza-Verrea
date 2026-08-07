import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/[slug]/actions/leave/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    leaveTeam: vi.fn(),
  })),
}));

describe('Oiseau Slug API [GET, POST]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/oiseaux/[slug]', () => {
    it('devrait réussir (200) et afficher le miroir intime si c est soi-même avec application du slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'mon-super-oiseau' },
      } as any);

      const mockOiseau = {
        uid: 'mon-super-oiseau',
        pseudo: 'Oiseau Libre',
        email: 'libre@ilot.local',
        sanctuaireVerrouille: false,
        isGhostMode: false,
      };

      vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockOiseau),
      } as any);

      const req = new Request('http://localhost/api/oiseaux/Mon Super Oiseau!');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.email).toBe('libre@ilot.local');
      expect(OiseauModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-super-oiseau' }, { uid: 'mon-super-oiseau' }],
      });
    });
  });

  describe('POST /api/oiseaux/[slug]', () => {
    it('devrait retourner 403 si l oiseau tente de forcer l envol d un autre (violation de souveraineté)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'autre-oiseau' },
      } as any);

      const req = new Request('http://localhost/api/oiseaux/Mon Super Oiseau!', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'CLEAN', teamId: 'team-1' }),
      });

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Souveraineté violée');
    });

    it('devrait réussir (200) l envol si les conditions de souveraineté et le slugify sont respectés', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'mon-super-oiseau', capabilities: [] },
      } as any);

      const mockLeaveTeam = vi.fn().mockResolvedValueOnce({ success: true, message: 'Envol réussi' });
      vi.mocked(TeamOrchestrator).mockImplementationOnce(() => ({
        leaveTeam: mockLeaveTeam,
      } as any));

      const req = new Request('http://localhost/api/oiseaux/Mon Super Oiseau!', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'CLEAN', teamId: 'team-1' }),
      });

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockLeaveTeam).toHaveBeenCalledWith(
        'team-1',
        'mon-super-oiseau',
        'CLEAN',
        { actorUid: 'mon-super-oiseau', capabilities: [] }
      );
    });
  });
});