import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/teams/route';
import { getServerSession } from 'next-auth/next';
import { TeamSchema } from '@ilot/types'; 

// ==========================================
// MOCKS DU SANCTUAIRE (Gérés via vi.hoisted)
// ==========================================
const { mockNeo4jRun, mockFindLean, mockConnectToDatabase, mockFosterTeam } = vi.hoisted(() => ({
  mockNeo4jRun: vi.fn(),
  mockFindLean: vi.fn(),
  mockConnectToDatabase: vi.fn().mockResolvedValue(true),
  mockFosterTeam: vi.fn()
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// 🪡 SUTURE : Double bouclier de mock pour intercepter l'import court
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mockConnectToDatabase,
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mockNeo4jRun,
    close: vi.fn()
  })),
  TeamModel: {
    find: vi.fn().mockImplementation(() => ({
      lean: mockFindLean
    }))
  }
}));

// 🪡 SUTURE : Double bouclier de mock pour intercepter l'import profond (anti-timeout)
vi.mock('@ilot/infrastructure/src/database/models/nosql/team.model', () => ({
  TeamModel: {
    find: vi.fn().mockImplementation(() => ({
      lean: mockFindLean
    }))
  }
}));

vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({
    fosterTeam: mockFosterTeam
  }))
}));

describe('API Teams - Collection / Nids (/api/teams)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    
    // Valeurs par défaut sécurisées pour éviter les fuites entre tests
    mockNeo4jRun.mockResolvedValue({ records: [] });
    mockFindLean.mockResolvedValue([]);
  });

  // ==========================================
  // TESTS POUR LE GET (RECENSEMENT)
  // ==========================================
  describe('Recensement des Nids (GET)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/teams');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('🟢 doit recenser les Nids de l’Oiseau avec succès et enrichir les membres (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1' }
      } as any);

      mockNeo4jRun.mockImplementation((query) => {
        if (query.includes('FOUNDED|MEMBER_OF|INVITED_TO')) {
          return Promise.resolve({
            records: [{ get: (field: string) => (field === 'teamUid' ? 'team_1' : 'FOUNDED') }]
          });
        }
        if (query.includes('DISTINCT m.uid')) {
          return Promise.resolve({
            records: [{ get: (field: string) => (field === 'uid' ? 'bird_1' : 'Architecte') }]
          });
        }
        return Promise.resolve({ records: [] });
      });

      mockFindLean.mockResolvedValueOnce([
        { uid: 'team_1', slug: 'team_slug_1', name: 'Nid Alpha', ownerUid: 'bird_1' }
      ]);

      const req = new Request('http://localhost/api/teams');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].name).toBe('Nid Alpha');
    });

    it('🔥 doit gérer une rupture de la Silice ou du Graphe (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1' }
      } as any);
      
      mockConnectToDatabase.mockRejectedValueOnce(new Error("Silice brisée"));

      const req = new Request('http://localhost/api/teams');
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ==========================================
  // TESTS POUR LE POST (FONDATION)
  // ==========================================
  describe('Fondation de Nid (POST)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Nid Libre' })
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si l’Oiseau n’a pas l’Aura requise (403)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: [] }
      } as any);

      const req = new Request('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Nid Interdit' })
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('🔴 doit rejeter si le corps de requête est invalide selon le schéma Zod (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      const req = new Request('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ description: 'Manque le nom' })
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('🟢 doit fonder un nouveau Nid avec succès (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      mockFosterTeam.mockResolvedValueOnce({ uid: 'team_new', name: 'Nid de la Canopée' });

      // 🪡 SUTURE : Le payload ultime, parfait et inattaquable pour Zod
      const payloadZodCompliant = {
        name: 'Nid de la Canopée',
        slug: 'nid-canopee',
        description: 'Un refuge magnifique.',
        domain: 'ARTS',      
        theme: 'FOREST',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        members: [],       // 👈 LE VOILÀ LE SECRET DE LA RÉUSSITE
        invitations: []    // 👈 ET SON FRÈRE JUMEAU
      };

      const req = new Request('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify(payloadZodCompliant)
      });

      const res = await POST(req);
      const data = await res.json();

      if (res.status === 400) {
        console.error("Zod Validation Failed in test:", JSON.stringify(data.errors, null, 2));
      }

      expect(res.status).toBe(201);
      expect(data.name).toBe('Nid de la Canopée');
      expect(mockFosterTeam).toHaveBeenCalled();
    });
  });
});