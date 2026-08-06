import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/tasks/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
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
    generateStructuredKey: vi.fn().mockReturnValue('tasks/task_1/attachments/test.png'),
    extractKeyFromUrl: vi.fn().mockReturnValue('tasks/task_1/attachments/test.png'),
    deleteFile: vi.fn().mockResolvedValue(true)
  }
}));

const mockRun = vi.fn().mockResolvedValue({
  records: [{ get: () => 'bird_1' }]
});
const mockFindOneAndUpdate = vi.fn();
const mockUpdateOne = vi.fn();
const mockConnectToDatabase = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args),
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mockRun,
    close: vi.fn()
  })),
  TaskModel: {
    findOneAndUpdate: vi.fn().mockImplementation(() => ({ lean: mockFindOneAndUpdate })),
    updateOne: (...args: any[]) => mockUpdateOne(...args)
  }
}));

describe('API Tasks - Upload et Pièces Jointes (/api/tasks/[taskId]/upload)', () => {
  const mockParams = { params: Promise.resolve({ taskId: 'task_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  // ==========================================
  // TESTS POUR LE POST (UPLOAD)
  // ==========================================
  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api', { method: 'POST' });
      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('🔴 doit rejeter si l’Aura est insuffisante (403)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_stranger', capabilities: [] }
      } as any);
      // Neo4j retourne un créateur différent et pas de caps
      mockRun.mockResolvedValueOnce({ records: [] });

      const req = new Request('http://localhost/api', { method: 'POST' });
      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('🟢 doit téléverser l’artefact avec succès et le lier à l’Atome (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      mockFindOneAndUpdate.mockResolvedValueOnce({ uid: 'task_1', documents: [] });

      const req = new Request('http://localhost/api', { method: 'POST' });
      // Simulation rigoureuse du FormData
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
          if (key === 'label') return 'Schéma Atome';
          return null;
        }
      } as any);

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.attachment.name).toBe('test.png');
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
    });
  });

  // ==========================================
  // TESTS POUR LE DELETE (PURGE)
  // ==========================================
  describe('Désintégration d’artefact (DELETE)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api', {
        method: 'DELETE',
        body: JSON.stringify({ key: 'url' })
      });

      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si la clé est manquante (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      const req = new Request('http://localhost/api', {
        method: 'DELETE',
        body: JSON.stringify({})
      });

      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(400);
    });

    it('🟢 doit désintégrer l’artefact physiquement et dans la Silice (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockUpdateOne.mockResolvedValueOnce(true);

      const req = new Request('http://localhost/api', {
        method: 'DELETE',
        body: JSON.stringify({ key: 'http://cloud.com/tasks/task_1/attachments/test.png' })
      });

      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdateOne).toHaveBeenCalled();
    });
  });
});