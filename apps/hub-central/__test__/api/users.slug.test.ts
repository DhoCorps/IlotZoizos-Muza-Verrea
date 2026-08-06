import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/users/[slug]/route';
import { getServerSession } from 'next-auth/next';

const mocks = vi.hoisted(() => {
  const mockFindOneLeanFn = vi.fn();
  return {
    mockFindOneLean: mockFindOneLeanFn,
    mockConnectToDatabase: vi.fn().mockResolvedValue(true),
    mockOiseauModel: {
      findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLeanFn }))
    }
  };
});

const { mockFindOneLean, mockConnectToDatabase } = mocks;

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mocks.mockConnectToDatabase,
  OiseauModel: mocks.mockOiseauModel
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: mocks.mockOiseauModel
}));

describe('API Users - Profil Oiseau par Slug (GET /api/users/[slug])', () => {
  const mockParams = { params: Promise.resolve({ slug: 'bird_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  describe('Consultation et Résilience (GET)', () => {
    it('🔥 doit gérer une rupture de la Silice avec élégance (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      mockConnectToDatabase.mockRejectedValueOnce(new Error("Silice brisée"));

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.message).toContain('injoignable');
    });

    it('🔴 doit renvoyer 404 si l’Oiseau n’existe pas dans la Matrice', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      mockFindOneLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.message).toContain('dissipée');
    });
  });

  describe('Application des Filtres de Résonance', () => {
    it('🟢 [Miroir Intime] doit renvoyer les données complètes si c’est soi-même', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_slug_1',
        slug: 'bird_slug_1',
        pseudo: 'Architecte',
        email: 'secret@ilot.com',
        entropieActive: 88,
        frequenceHEX: '#123456'
      });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.email).toBe('secret@ilot.com');
      expect(data.entropieActive).toBe(88);
      expect(data.pseudo).toBe('Architecte');
    });

    it('🟢 [Sanctuaire Verrouillé] doit masquer totalement le profil', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'other_bird' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_slug_1',
        pseudo: 'Déchu',
        email: 'secret@ilot.com',
        sanctuaireVerrouille: true,
        sanctuaire: { message: "Disparu" },
        avatarUrl: 'http://image.com/avatar.png'
      });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.email).toBeUndefined();
      expect(data.avatarUrl).toBeNull();
      expect(data.frequenceHEX).toBe('#000000');
    });

    it('🟢 [Mode Ghost] doit renvoyer un profil embrumé', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'other_bird' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_slug_1',
        pseudo: 'Fantôme',
        email: 'ghost@ilot.com',
        isGhostMode: true,
        frequenceHEX: '#888888',
        avatarUrl: 'http://image.com/ghost.png'
      });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.email).toBeUndefined();
      expect(data.message_statut).toContain('silence');
    });
  });
});