import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../../app/api/teams/[slug]/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE (Gérés via vi.hoisted)
// ==========================================
const mocks = vi.hoisted(() => {
  const mockFindOneLeanFn = vi.fn();
  return {
    mockNeo4jRun: vi.fn().mockResolvedValue({
      records: [{ get: (field: string) => (field === 'caps' ? ['team:read', 'team:update', 'team:delete'] : 'MEMBER_OF') }]
    }),
    mockClose: vi.fn(),
    mockFindOneLean: mockFindOneLeanFn,
    mockConnectToDatabase: vi.fn().mockResolvedValue(true),
    mockMutateTeam: vi.fn(),
    mockDissolveTeam: vi.fn(),
    TeamModel: {
      findOne: vi.fn().mockImplementation(() => ({
        lean: mockFindOneLeanFn
      }))
    }
  };
});

const { 
  mockNeo4jRun, 
  mockClose, 
  mockFindOneLean, 
  mockConnectToDatabase, 
  mockMutateTeam, 
  mockDissolveTeam 
} = mocks;

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mocks.mockConnectToDatabase(...args),
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mocks.mockNeo4jRun,
    close: mocks.mockClose
  })),
  TeamModel: mocks.TeamModel
}));

vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    mutateTeam: mocks.mockMutateTeam,
    dissolveTeam: mocks.mockDissolveTeam
  }))
}));

describe('API Teams - Par Slug / Nid (/api/teams/[slug])', () => {
  const mockParams = { params: Promise.resolve({ slug: 'team_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    mockNeo4jRun.mockResolvedValue({
      records: [{ get: (field: string) => (field === 'caps' ? ['team:read', 'team:update', 'team:delete'] : 'MEMBER_OF') }]
    });
  });

  // ==========================================
  // TESTS POUR LE GET
  // ==========================================
  describe('Consultation (GET)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🟢 doit ausculter le Nid avec succès et renvoyer ses capacités (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1', name: 'Nid Central' });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('Nid Central');
      expect(data.myCapabilities).toBeDefined();
      expect(data.invitations).toBeDefined();
    });
  });

  // ==========================================
  // TESTS POUR LE PUT
  // ==========================================
  describe('Mutation (PUT)', () => {
    it('🟢 doit faire muter le Nid avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1' });
      mockMutateTeam.mockResolvedValueOnce({ uid: 'team_1', name: 'Nid Muté' });

      const req = new Request('http://localhost/api', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nid Muté' })
      });

      const res = await PUT(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('Nid Muté');
      expect(mockMutateTeam).toHaveBeenCalledWith('team_1', { name: 'Nid Muté' }, expect.any(Object));
    });
  });

  // ==========================================
  // TESTS POUR LE DELETE
  // ==========================================
  describe('Dissolution (DELETE)', () => {
    it('🟢 doit dissoudre le Nid avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1' });
      mockDissolveTeam.mockResolvedValueOnce(true);

      const req = new Request('http://localhost/api', {
        method: 'DELETE'
      });

      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('dissous');
      expect(mockDissolveTeam).toHaveBeenCalledWith('team_1', expect.any(Object));
    });
  });
});

describe('API Teams - Par Slug / Nid (/api/teams/[slug])', () => {
  const mockParams = { params: Promise.resolve({ slug: 'team_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    mockNeo4jRun.mockResolvedValue({
      records: [{ get: (field: string) => (field === 'caps' ? ['team:read', 'team:update', 'team:delete'] : 'MEMBER_OF') }]
    });
  });

  // ==========================================
  // TESTS POUR LE GET
  // ==========================================
  describe('Consultation (GET)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🟢 doit ausculter le Nid avec succès et renvoyer ses capacités (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1', name: 'Nid Central' });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('Nid Central');
      expect(data.myCapabilities).toBeDefined();
      expect(data.invitations).toBeDefined();
    });
  });

  // ==========================================
  // TESTS POUR LE PUT
  // ==========================================
  describe('Mutation (PUT)', () => {
    it('🟢 doit faire muter le Nid avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1' });
      mockMutateTeam.mockResolvedValueOnce({ uid: 'team_1', name: 'Nid Muté' });

      const req = new Request('http://localhost/api', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nid Muté' })
      });

      const res = await PUT(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('Nid Muté');
      expect(mockMutateTeam).toHaveBeenCalledWith('team_1', { name: 'Nid Muté' }, expect.any(Object));
    });
  });

  // ==========================================
  // TESTS POUR LE DELETE
  // ==========================================
  describe('Dissolution (DELETE)', () => {
    it('🟢 doit dissoudre le Nid avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'team_1', slug: 'team_slug_1' });
      mockDissolveTeam.mockResolvedValueOnce(true);

      const req = new Request('http://localhost/api', {
        method: 'DELETE'
      });

      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('dissous');
      expect(mockDissolveTeam).toHaveBeenCalledWith('team_1', expect.any(Object));
    });
  });
});