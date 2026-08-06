import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/teams/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE (Gérés via vi.hoisted)
// ==========================================
const { mockNeo4jRun, mockFindOneLean, mockFindOneAndUpdateLean, mockUpdateOne, mockConnectToDatabase } = vi.hoisted(() => ({
  mockNeo4jRun: vi.fn().mockResolvedValue({
    records: [{ get: (field: string) => (field === 'userCaps' ? ['*'] : []) }]
  }),
  mockFindOneLean: vi.fn(),
  mockFindOneAndUpdateLean: vi.fn(),
  mockUpdateOne: vi.fn(),
  mockConnectToDatabase: vi.fn().mockResolvedValue(true)
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue(true)
  })),
  PutObjectCommand: vi.fn()
}));

vi.mock('../../../../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('teams/team_1/attachments/test.png'),
    extractKeyFromUrl: vi.fn().mockReturnValue('teams/team_1/attachments/test.png'),
    deleteFile: vi.fn().mockResolvedValue(true)
  }
}));

// 🪡 SUTURE : Double bouclier de mock pour l'Upload
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mockConnectToDatabase,
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mockNeo4jRun,
    close: vi.fn()
  })),
  TeamModel: {
    findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLean })),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({ lean: mockFindOneAndUpdateLean })),
    updateOne: mockUpdateOne
  }
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/team.model', () => ({
  TeamModel: {
    findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLean })),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({ lean: mockFindOneAndUpdateLean })),
    updateOne: mockUpdateOne
  }
}));

describe('API Teams - Upload et Pièces Jointes (/api/teams/[slug]/upload)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'team_slug_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    
    // Valeurs par défaut blindées pour empêcher Mongoose de timer-out
    mockFindOneLean.mockResolvedValue({ uid: 'team_1', slug: 'team_slug_1' });
    mockFindOneAndUpdateLean.mockResolvedValue({ uid: 'team_1', documents: [] });
    mockUpdateOne.mockResolvedValue(true);
  });

  // ==========================================
  // TESTS POUR LE TÉLÉVERSEMENT (POST)
  // ==========================================
  describe('Téléversement d’artefacts (POST)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/teams/team_slug_1/upload', { method: 'POST' });
      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit renvoyer 404 si le Nid est introuvable dans la Silice', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      // On simule explicitement un introuvable pour ce test précis
      mockFindOneLean.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/teams/team_slug_1/upload', { method: 'POST' });
      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(404);
    });

    it('🔴 doit rejeter si aucun fichier (brindille) n’est transmis (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      const req = new Request('http://localhost/api/teams/team_slug_1/upload', { method: 'POST' });
      req.formData = async () => ({
        get: () => null
      } as any);

      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(400);
    });

    it('🟢 doit téléverser l’artefact avec succès et le lier au Nid dans la Silice (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      const req = new Request('http://localhost/api/teams/team_slug_1/upload', { method: 'POST' });
      req.formData = async () => ({
        get: (key: string) => {
          if (key === 'file') {
            return {
              name: 'test.png',
              type: 'image/png',
              size: 500,
              arrayBuffer: async () => new ArrayBuffer(10)
            };
          }
          if (key === 'label') return 'Logo Nid';
          return null;
        }
      } as any);

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.publicUrl).toBeDefined();
    });
  });

  // ==========================================
  // TESTS POUR LA PURGE / DELETE
  // ==========================================
  describe('Désintégration d’artefact (DELETE)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/teams/team_slug_1/upload', {
        method: 'DELETE',
        body: JSON.stringify({ key: 'url' })
      });

      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si la clé de l’artefact est absente (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      const req = new Request('http://localhost/api/teams/team_slug_1/upload', {
        method: 'DELETE',
        body: JSON.stringify({})
      });

      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(400);
    });

    it('🟢 doit désintégrer l’artefact physiquement et nettoyer la Silice (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      const req = new Request('http://localhost/api/teams/team_slug_1/upload', {
        method: 'DELETE',
        body: JSON.stringify({ key: 'http://cloud.com/teams/team_1/attachments/test.png' })
      });

      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});