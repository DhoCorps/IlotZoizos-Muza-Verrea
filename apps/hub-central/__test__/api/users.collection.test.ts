import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/users/route';
import { getServerSession } from 'next-auth/next';

  const mocks = vi.hoisted(() => {
  const mockFindLeanFn = vi.fn();
  const mockFindOneLeanFn = vi.fn();
  const mockFindChainingFn = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: mockFindLeanFn
  }));

  return {
    mockFindLean: mockFindLeanFn, mockFindOneLean: mockFindOneLeanFn, mockFindChaining: mockFindChainingFn,
    mockConnectToDatabase: vi.fn().mockResolvedValue(true), mockFosterOiseau: vi.fn(),
    mockOiseauModel: { find: mockFindChainingFn, findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLeanFn })) }
  };
});

// Déstructuration POUR tes tests (ne change rien à tes "it")
const { mockFindLean, mockFindOneLean, mockFindChaining, mockConnectToDatabase, mockFosterOiseau } = mocks;

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mocks.mockConnectToDatabase, OiseauModel: mocks.mockOiseauModel
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({ OiseauModel: mocks.mockOiseauModel }));

vi.mock('@ilot/shared-core', () => ({
  OiseauOrchestrator: vi.fn().mockImplementation(() => ({ fosterOiseau: mocks.mockFosterOiseau }))
}));

  describe('API Users - Volière Publique et Éclosion (/api/users)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockConnectToDatabase.mockResolvedValue(true);
  });

  // ==========================================
  // TESTS POUR LE GET (RECENSEMENT)
  // ==========================================
  describe('Recensement des Oiseaux (GET)', () => {
    it('🔴 doit repousser les étrangers non identifiés (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/users');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('invisible aux étrangers');
    });

    it('🟢 doit recenser tous les Oiseaux si aucune recherche n’est fournie (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird_1' } } as any);
      
      mockFindLean.mockResolvedValueOnce([
        { uid: 'bird_1', slug: 'bird-1', pseudo: 'Alpha' }
      ]);

      const req = new Request('http://localhost/api/users');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0].slug).toBe('bird-1');
      expect(mockFindChaining).toHaveBeenCalledWith({}); // Aucune requête de recherche
    });

    it('🟢 doit appliquer un filtre de recherche par slug ou pseudo (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird_1' } } as any);
      
      mockFindLean.mockResolvedValueOnce([]);

      const req = new Request('http://localhost/api/users?search=alpha');
      const res = await GET(req);
      
      expect(res.status).toBe(200);
      // On vérifie que Mongoose a bien reçu la consigne de chercher dans le slug
      expect(mockFindChaining).toHaveBeenCalledWith({
        $or: [
          { slug: { $regex: 'alpha', $options: 'i' } },
          { pseudo: { $regex: 'alpha', $options: 'i' } },
          { capabilities: { $regex: 'alpha', $options: 'i' } }
        ]
      });
    });

    it('🔥 doit gérer une rupture de la Silice avec élégance (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird_1' } } as any);
      mockConnectToDatabase.mockRejectedValueOnce(new Error("Silice brisée"));

      const req = new Request('http://localhost/api/users');
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ==========================================
  // TESTS POUR LE POST (INSCRIPTION)
  // ==========================================
  describe('Éclosion d’un Oiseau (POST)', () => {
    it('🔴 doit rejeter si l’œuf est incomplet (400)', async () => {
      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@ilot.com' }) // Manque pseudo et password
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('incomplet');
    });

    it('🔴 doit rejeter avec un conflit si l’email ou pseudo est déjà pris (409)', async () => {
      mockFindOneLean.mockResolvedValueOnce({ uid: 'existing_bird' }); // Oiseau trouvé

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'pris@ilot.com', pseudo: 'Voleur', password: '123' })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain('chante déjà');
    });

    it('🟢 doit faire éclore l’Oiseau et renvoyer son slug avec succès (201)', async () => {
      mockFindOneLean.mockResolvedValueOnce(null); // Oiseau libre
      
      mockFosterOiseau.mockResolvedValueOnce({
        mongo: { uid: 'new_bird_uid', slug: 'voleur-agile' }
      });

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'libre@ilot.com', pseudo: 'Voleur Agile', password: '123' })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.slug).toBe('voleur-agile');
      expect(mockFosterOiseau).toHaveBeenCalled();
    });

    it('🔥 doit gérer un échec interne de l’Orchestrateur (500)', async () => {
      mockFindOneLean.mockResolvedValueOnce(null);
      mockFosterOiseau.mockRejectedValueOnce({ statusCode: 500, message: "Échec de Forge Neo4j" });

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'libre@ilot.com', pseudo: 'Voleur Agile', password: '123' })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Échec de Forge');
    });
  });
});