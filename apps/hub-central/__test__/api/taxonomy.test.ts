import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/taxonomy/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockLean = vi.fn();
const mockSort = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));
const mockFindOneLean = vi.fn();
const mockFindOne = vi.fn().mockImplementation(() => ({ lean: mockFindOneLean }));
const mockCreate = vi.fn();
const mockConnectToDatabase = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args),
  TaxonomyModel: {
    find: (...args: any[]) => mockFind(...args),
    findOne: (...args: any[]) => mockFindOne(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

describe('API Taxonomy - Référentiels et Tags (/api/taxonomy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  // ==========================================
  // TESTS POUR LE GET
  // ==========================================
  describe('Lecture des Taxonomies (GET)', () => {
    it('🟢 doit renvoyer les tags de la Silice et les fallbacks statiques (200)', async () => {
      mockLean.mockResolvedValueOnce([{ uid: 'tax_1', name: 'Cyberpunk', domain: 'style' }]);

      const req = new Request('http://localhost/api/taxonomy?domain=style');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0].name).toBe('Cyberpunk');
      expect(data.categories).toBeDefined();
      expect(data.instruments).toBeDefined();
    });

    it('🔥 doit gérer une rupture de la Silice avec élégance (500)', async () => {
      mockConnectToDatabase.mockRejectedValueOnce(new Error("Panne Silice"));

      const req = new Request('http://localhost/api/taxonomy');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain("Silice est injoignable");
    });
  });

  // ==========================================
  // TESTS POUR LE POST
  // ==========================================
  describe('Sédimentation de Tag (POST)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/taxonomy', {
        method: 'POST',
        body: JSON.stringify({ name: 'Rock', domain: 'music', type: 'genre' })
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si les paramètres sont incomplets (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      const req = new Request('http://localhost/api/taxonomy', {
        method: 'POST',
        body: JSON.stringify({ name: 'Rock' }) // Manque domain et type
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('🟢 doit renvoyer le tag s’il existe déjà (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'tax_existing', name: 'Rock' });

      const req = new Request('http://localhost/api/taxonomy', {
        method: 'POST',
        body: JSON.stringify({ name: 'Rock', domain: 'music', type: 'genre' })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('existe déjà');
    });

    it('🟢 doit sédimenter un nouveau tag personnalisé avec succès (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({ uid: 'tax_new', name: 'Jazz Fretless' });

      const req = new Request('http://localhost/api/taxonomy', {
        method: 'POST',
        body: JSON.stringify({ name: 'Jazz Fretless', domain: 'music', type: 'genre' })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Jazz Fretless');
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});