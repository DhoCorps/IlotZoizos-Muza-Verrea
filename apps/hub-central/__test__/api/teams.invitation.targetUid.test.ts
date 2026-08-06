import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../../app/api/teams/[slug]/invitations/[targetUid]/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFindOneLean = vi.fn();
const mockConnectToDatabase = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args),
  TeamModel: {
    findOne: vi.fn().mockImplementation(() => ({
      lean: mockFindOneLean
    }))
  }
}));

const mockNeo4jRun = vi.fn();
const mockTransactionManagerExecute = vi.fn().mockImplementation(async (name, callback) => {
  return await callback({}, { run: mockNeo4jRun });
});

vi.mock('@ilot/shared-core', () => ({
  TransactionManager: {
    execute: (...args: any[]) => mockTransactionManagerExecute(...args)
  }
}));

describe('API Teams - Révocation d’Invitation par Slug (/api/teams/[slug]/invitations/[targetUid])', () => {
  const mockParams = { params: Promise.resolve({ slug: 'team_slug_1', targetUid: 'bird_target' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  // ==========================================
  // TESTS DE SÉCURITÉ ET CONTRÔLE D'ACCÈS
  // ==========================================
  describe('Contrôles d’authentification et de gouvernance', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/teams/team_slug_1/invitations/bird_target', { 
        method: 'DELETE' 
      });
      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.error).toContain("Oiseau non identifié");
    });

    it('🔴 doit renvoyer 404 si le Nid est introuvable via son slug', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_owner', capabilities: [] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/teams/team_slug_1/invitations/bird_target', { 
        method: 'DELETE' 
      });
      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('Nid introuvable');
    });

    it('🔴 doit rejeter (403) si l’oiseau n’est ni propriétaire du Nid ni architecte', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_stranger', capabilities: [] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ 
        uid: 'team_1', 
        slug: 'team_slug_1', 
        ownerUid: 'bird_owner' 
      });

      const req = new Request('http://localhost/api/teams/team_slug_1/invitations/bird_target', { 
        method: 'DELETE' 
      });
      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Aura insuffisante');
    });
  });

  // ==========================================
  // TESTS NOMINAUX DE RÉVOCATION
  // ==========================================
  describe('Exécution de la révocation', () => {
    it('🟢 doit révoquer l’invitation avec succès si l’on est propriétaire du Nid (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_owner', capabilities: [] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ 
        uid: 'team_1', 
        slug: 'team_slug_1', 
        ownerUid: 'bird_owner' 
      });
      mockNeo4jRun.mockResolvedValueOnce({ records: [{ get: () => 1 }] });

      const req = new Request('http://localhost/api/teams/team_slug_1/invitations/bird_target', { 
        method: 'DELETE' 
      });
      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('révoquée');
      expect(mockTransactionManagerExecute).toHaveBeenCalled();
    });

    it('🟢 doit révoquer l’invitation avec succès si l’on possède l’Aura absolue * (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_architect', capabilities: ['*'] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ 
        uid: 'team_1', 
        slug: 'team_slug_1', 
        ownerUid: 'bird_owner' 
      });
      mockNeo4jRun.mockResolvedValueOnce({ records: [{ get: () => 1 }] });

      const req = new Request('http://localhost/api/teams/team_slug_1/invitations/bird_target', { 
        method: 'DELETE' 
      });
      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTransactionManagerExecute).toHaveBeenCalled();
    });

    it('🔥 doit gérer une rupture interne ou une absence d’invitation active (400/500)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_owner', capabilities: ['*'] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ 
        uid: 'team_1', 
        slug: 'team_slug_1', 
        ownerUid: 'bird_owner' 
      });
      // Simulation d'un graphe sans relation d'invitation trouvée
      mockNeo4jRun.mockResolvedValueOnce({ records: [] });

      const req = new Request('http://localhost/api/teams/team_slug_1/invitations/bird_target', { 
        method: 'DELETE' 
      });
      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(data.error).toBeDefined();
    });
  });
});