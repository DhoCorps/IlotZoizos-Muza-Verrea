import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/users/[slug]/observatory/route';
import { getServerSession } from 'next-auth/next';

const mocks = vi.hoisted(() => {
  const mockFindOneLeanFn = vi.fn();
  return {
    mockFindOneLean: mockFindOneLeanFn,
    mockConnectToDatabase: vi.fn().mockResolvedValue(true),
    mockGenerateReport: vi.fn(),
    mockOiseauModel: {
      findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLeanFn }))
    }
  };
});

const { mockFindOneLean, mockConnectToDatabase, mockGenerateReport } = mocks;

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

vi.mock('@ilot/shared-core', () => ({
  ObservatoryEngine: {
    generateReport: mocks.mockGenerateReport
  }
}));

describe('API Users - Observatoire Vibratoire par Slug (/api/users/[slug]/observatory)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'bird_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  describe('Auscultation et Sécurité (GET)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('non identifié');
    });

    it('🔴 doit rejeter (403) si l’Oiseau tente d’ausculter la vibration d’un autre', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'other_bird_uid', capabilities: ['MEMBER'] }
      } as any);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Souveraineté violée');
    });

    it('🔴 doit renvoyer 404 si l’Oiseau est introuvable dans la Silice', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1', capabilities: [] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('introuvable');
    });

    it('🔥 doit gérer une rupture de la Silice avec élégance (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1' }
      } as any);
      
      mockConnectToDatabase.mockRejectedValueOnce(new Error("Silice brisée"));

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Silice');
    });

    it('🟢 doit autoriser un Administrateur (*) à ausculter un autre Oiseau (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'admin_bird', capabilities: ['*'] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_1',
        slug: 'bird_slug_1',
        pseudo: 'Artisan'
      });

      mockGenerateReport.mockReturnValueOnce({ score: 98, status: 'HARMONY' });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.birdName).toBe('Artisan');
      expect(data.report).toBeDefined();
    });

    it('🟢 doit ausculter sa propre vibration avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1', capabilities: [] }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({
        uid: 'bird_1',
        slug: 'bird_slug_1',
        pseudo: 'Architecte',
        entropieActive: 50,
        currentAcceptance: 4
      });

      mockGenerateReport.mockReturnValueOnce({ score: 85, status: 'STABLE' });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.birdName).toBe('Architecte');
      expect(data.report.score).toBe(85);
    });
  });
});