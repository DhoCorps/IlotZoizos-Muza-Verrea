import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../../app/api/users/[slug]/actions/leave/route';
import { getServerSession } from 'next-auth/next';

const mocks = vi.hoisted(() => {
  const mockFindOneLeanFn = vi.fn();
  return {
    mockFindOneLean: mockFindOneLeanFn, mockConnectToDatabase: vi.fn().mockResolvedValue(true), mockLeaveTeam: vi.fn(),
    mockOiseauModel: { findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLeanFn })) }
  };
});

const { mockFindOneLean, mockConnectToDatabase, mockLeaveTeam } = mocks;

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mocks.mockConnectToDatabase, OiseauModel: mocks.mockOiseauModel
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/oiseau.model', () => ({ OiseauModel: mocks.mockOiseauModel }));

vi.mock('@ilot/shared-core', () => ({
  TeamOrchestrator: vi.fn().mockImplementation(() => ({ leaveTeam: mocks.mockLeaveTeam }))
}));

describe('API Actions - L’Oiseau quitte le Nid par Slug (/api/users/[slug]/actions/leave)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'bird_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  // ==========================================
  // TESTS POUR LA ROUTE POST (DÉPART D'UN NID)
  // ==========================================
  describe('L’Envol du Nid (POST)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api');
      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('non identifié');
    });

    it('🔴 doit rejeter si l’Oiseau tente de forcer le départ d’un autre (Souveraineté) (403)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_impostor' }
      } as any);

      const req = new Request('http://localhost/api');
      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Souveraineté violée');
    });

    it('🔴 doit rejeter si le payload est incomplet ou mal formé (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1' } // Doit matcher le slug
      } as any);

      const req = new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ teamId: 'team_1' }) // Manque le 'mode'
      });

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('incomplètes');
    });

    it('🔴 doit rejeter si le mode de départ est invalide (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1' }
      } as any);

      const req = new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ teamId: 'team_1', mode: 'DESTROY' }) // Mode invalide
      });

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('inconnu');
    });

    it('🟢 doit exécuter le départ du Nid avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1', capabilities: ['MEMBER'] }
      } as any);

      mockLeaveTeam.mockResolvedValueOnce({ success: true, message: "Vous avez quitté le Nid." });

      const req = new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ teamId: 'team_1', mode: 'CLEAN' })
      });

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockLeaveTeam).toHaveBeenCalledWith('team_1', 'bird_slug_1', 'CLEAN', expect.any(Object));
    });
  });

  // ==========================================
  // TESTS POUR LA ROUTE GET (MIROIR INTIME)
  // ==========================================
  describe('Miroir de l’Oiseau par Slug (GET)', () => {
    it('🔴 doit renvoyer 404 si l’Oiseau n’existe pas dans la Silice', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      mockFindOneLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      expect(res.status).toBe(404);
    });

    it('🟢 doit renvoyer le profil complet si c’est soi-même (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1' } // Est lui-même (match le param slug)
      } as any);

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_slug_1',
        slug: 'bird_slug_1',
        pseudo: 'Architecte',
        email: 'architecte@ilot.com',
        entropieActive: 100
      });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.email).toBeDefined(); // Visible car c'est lui-même
      expect(data.username).toBe('Architecte');
    });

    it('🟢 doit masquer les données si le sanctuaire est verrouillé (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null); // Visiteur anonyme

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_1',
        slug: 'bird_slug_1',
        pseudo: 'Fantôme',
        email: 'ghost@ilot.com',
        sanctuaireVerrouille: true
      });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.email).toBeUndefined();
      expect(data.signature).toContain('éteint');
    });
    
    it('🟢 doit masquer les données si le mode Fantôme est actif (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'other_bird' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_1',
        slug: 'bird_slug_1',
        pseudo: 'Espion',
        isGhostMode: true,
        frequenceHEX: '#FFFFFF'
      });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.signature).toContain('observe en silence');
      expect(data.frequenceHEX).toBe('#FFFFFF');
    });
  });
});