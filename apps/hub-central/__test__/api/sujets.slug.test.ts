import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../../app/api/sujets/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFindOneLean = vi.fn();
const mockFindOneForPut = vi.fn();
const mockFindOneAndUpdateLean = vi.fn();
const mockFindOneAndUpdate = vi.fn().mockImplementation(() => ({
  lean: mockFindOneAndUpdateLean
}));
const mockDeleteOne = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  SujetModel: {
    findOne: vi.fn().mockImplementation((query) => {
      return {
        lean: mockFindOneLean,
        then: (resolve: any) => resolve(mockFindOneForPut())
      };
    }),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({ lean: mockFindOneAndUpdateLean })),
    deleteOne: (...args: any[]) => mockDeleteOne(...args)
  }
}));

const mockDisintegrateSujet = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  SujetOrchestrator: vi.fn().mockImplementation(() => ({
    disintegrateSujet: mockDisintegrateSujet
  }))
}));

describe('API Sujets - Par Slug (GET / PUT / DELETE)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'sujet_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // TESTS POUR LE GET
  // ==========================================
  describe('Consultation (GET)', () => {
    it('🟢 doit retourner le monologue s’il est publié (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      mockFindOneLean.mockResolvedValueOnce({ uid: 'sujet_1', status: 'PUBLISHED' });
      
      const req = new Request('http://localhost/api');
      const res = await GET(req, mockParams);
      expect(res.status).toBe(200);
    });

    it('🟢 doit retourner le monologue privé si on est l’auteur (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_author' } } as any);
      mockFindOneLean.mockResolvedValueOnce({ uid: 'sujet_1', status: 'DRAFT', authorUid: 'bird_author' });
      
      const req = new Request('http://localhost/api');
      const res = await GET(req, mockParams);
      expect(res.status).toBe(200);
    });

    it('🔴 doit rejeter (403) si le monologue est intime et qu\'on n\'a pas les droits', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_other', capabilities: [] } } as any);
      mockFindOneLean.mockResolvedValueOnce({ uid: 'sujet_1', status: 'DRAFT', authorUid: 'bird_author' });
      
      const req = new Request('http://localhost/api');
      const res = await GET(req, mockParams);
      expect(res.status).toBe(403);
    });

    it('🔴 doit renvoyer 404 si le sujet est introuvable', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      mockFindOneLean.mockResolvedValueOnce(null);
      
      const req = new Request('http://localhost/api');
      const res = await GET(req, mockParams);
      expect(res.status).toBe(404);
    });

    it('🔥 doit gérer une erreur de lecture de la Silice (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      mockFindOneLean.mockRejectedValueOnce(new Error("Erreur Silice"));
      
      const req = new Request('http://localhost/api');
      const res = await GET(req, mockParams);
      expect(res.status).toBe(500);
    });
  });

  // ==========================================
  // TESTS POUR LE PUT
  // ==========================================
  describe('Mutation (PUT)', () => {
    it('❌ doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api', { method: 'PUT', body: JSON.stringify({}) });
      const res = await PUT(req, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit renvoyer 404 si le sujet n’existe pas', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindOneForPut.mockReturnValueOnce(null);

      const req = new Request('http://localhost/api', { method: 'PUT', body: JSON.stringify({ title: 'New' }) });
      const res = await PUT(req, mockParams);
      expect(res.status).toBe(404);
    });

    it('❌ doit rejeter (403) si l’oiseau n’est ni l’auteur ni l’architecte', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_stranger', capabilities: [] } } as any);
      mockFindOneForPut.mockReturnValueOnce({ uid: 'sujet_1', authorUid: 'bird_author' });

      const req = new Request('http://localhost/api', { method: 'PUT', body: JSON.stringify({ title: 'New' }) });
      const res = await PUT(req, mockParams);
      expect(res.status).toBe(403);
    });

    it('🟢 doit muter le sujet avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindOneForPut.mockReturnValueOnce({ uid: 'sujet_1', authorUid: 'bird_1' });
      mockFindOneAndUpdateLean.mockResolvedValueOnce({ uid: 'sujet_1', title: 'Updated Title' });
      
      const req = new Request('http://localhost/api', { method: 'PUT', body: JSON.stringify({ title: 'Updated Title' }) });
      const res = await PUT(req, mockParams);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
    });
  });

  // ==========================================
  // TESTS POUR LE DELETE
  // ==========================================
  describe('Désintégration (DELETE)', () => {
    it('❌ doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit renvoyer 404 si le sujet est introuvable pour dissolution', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindOneForPut.mockReturnValueOnce(null);

      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(404);
    });

    it('🟢 doit désintégrer le sujet via l’orchestrateur (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);
      mockFindOneForPut.mockReturnValueOnce({ uid: 'sujet_1', authorUid: 'bird_1' });
      mockDisintegrateSujet.mockResolvedValueOnce(true);
      
      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await DELETE(req, mockParams);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDisintegrateSujet).toHaveBeenCalled();
    });
  });
});