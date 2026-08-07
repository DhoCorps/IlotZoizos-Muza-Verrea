import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/teams/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, getNeo4jSession } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: {
    findOne: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => {
          if (key === 'caps') return ['*'];
          if (key === 'relType') return 'MEMBER_OF';
          return null;
        }
      }]
    }),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    mutateTeam: vi.fn(),
    dissolveTeam: vi.fn(),
  })),
}));

describe('Team Slug API [GET, PUT, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/teams/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/teams/mon-nid');
      const res = await GET(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié');
    });

    it('devrait réussir (200) et ausculter le nid en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockTeam = { uid: 'team-123', name: 'Nid Secret', slug: 'mon-super-nid' };
      vi.mocked(TeamModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTeam),
      } as any);

      const req = new Request('http://localhost/api/teams/Mon Super Nid!');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.uid).toBe('team-123');
      expect(TeamModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-super-nid' }, { uid: 'mon-super-nid' }]
      });
    });
  });

  describe('PUT /api/teams/[slug]', () => {
    it('devrait réussir (200) et muter le nid avec le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockTeam = { uid: 'team-123', name: 'Nid Secret', slug: 'mon-super-nid' };
      vi.mocked(TeamModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTeam),
      } as any);

      const mockMutateTeam = vi.fn().mockResolvedValueOnce({ ...mockTeam, name: 'Nid Muté' });
      vi.mocked(TeamOrchestrator).mockImplementationOnce(() => ({
        mutateTeam: mockMutateTeam,
        dissolveTeam: vi.fn(),
      } as any));

      const req = new Request('http://localhost/api/teams/Mon Super Nid!', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nid Muté' }),
      });

      const res = await PUT(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('Nid Muté');
      expect(mockMutateTeam).toHaveBeenCalledWith(
        'team-123',
        { name: 'Nid Muté' },
        expect.any(Object)
      );
      expect(TeamModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-super-nid' }, { uid: 'mon-super-nid' }]
      });
    });
  });

  describe('DELETE /api/teams/[slug]', () => {
    it('devrait réussir (200) et dissoudre le nid avec le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockTeam = { uid: 'team-123', name: 'Nid Secret', slug: 'mon-super-nid' };
      vi.mocked(TeamModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTeam),
      } as any);

      const mockDissolveTeam = vi.fn().mockResolvedValueOnce(true);
      vi.mocked(TeamOrchestrator).mockImplementationOnce(() => ({
        mutateTeam: vi.fn(),
        dissolveTeam: mockDissolveTeam,
      } as any));

      const req = new Request('http://localhost/api/teams/Mon Super Nid!', {
        method: 'DELETE',
      });

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('dissous');
      expect(mockDissolveTeam).toHaveBeenCalledWith(
        'team-123',
        expect.any(Object)
      );
      expect(TeamModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-super-nid' }, { uid: 'mon-super-nid' }]
      });
    });
  });
});