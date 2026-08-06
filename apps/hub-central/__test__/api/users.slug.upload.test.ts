import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/users/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';

// 🪡 IMPORT DU SERVICE RÉEL (Le chemin exact depuis __test__/api/)
import { storageService } from '../../modules/storage/storage.service';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
const mocks = vi.hoisted(() => {
  const mockFindOneAndUpdateLeanFn = vi.fn();
  const mockUpdateOneFn = vi.fn();
  return {
    mockNeo4jRun: vi.fn(),
    mockConnectToDatabase: vi.fn().mockResolvedValue(true),
    mockOiseauModel: {
      findOneAndUpdate: vi.fn().mockImplementation(() => ({
        lean: mockFindOneAndUpdateLeanFn
      })),
      updateOne: mockUpdateOneFn
    }
  };
});

const { mockNeo4jRun, mockConnectToDatabase } = mocks;
const mockFindOneAndUpdateLeanFn = mocks.mockOiseauModel.findOneAndUpdate().lean as any;
const mockUpdateOne = mocks.mockOiseauModel.updateOne;

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mocks.mockConnectToDatabase,
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mocks.mockNeo4jRun,
    close: vi.fn()
  })),
  OiseauModel: mocks.mockOiseauModel
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: mocks.mockOiseauModel
}));

describe('API Users - Mutation d’Apparence par Slug (POST / DELETE)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'bird_slug_1' }) };

  // Pointeurs pour nos espions S3
  let uploadSpy: any;
  let deleteSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Base de données simulée
    mockConnectToDatabase.mockResolvedValue(true);
    mockFindOneAndUpdateLeanFn.mockResolvedValue({ uid: 'bird_1', slug: 'bird_slug_1', pseudo: 'Architecte' });
    mockUpdateOne.mockResolvedValue(true);
    mockNeo4jRun.mockResolvedValue(true);

    // 🛡️ DÉTOURNEMENT EN MÉMOIRE (La technique experte)
    // On remplace les méthodes du vrai service directement. Impossible pour la route d'y échapper.
    uploadSpy = vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      message: 'Mocked',
      key: 'avatar.png',
      publicUrl: 'http://cloud.com/avatar.png'
    });

    deleteSpy = vi.spyOn(storageService, 'deleteFile').mockResolvedValue({
      success: true
    });
  });

  describe('Mutation de l’Avatar (POST)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api', { method: 'POST' });
      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si l’Oiseau tente de modifier l’apparence d’un autre (403)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'other_bird' }
      } as any);

      const req = new Request('http://localhost/api', { method: 'POST' });
      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(403);
    });

    it('🔴 doit rejeter si aucune brindille ou type n’est fourni (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1' }
      } as any);

      const req = new Request('http://localhost/api', { method: 'POST' });
      // Simulation d'un formData vide (Détournement sécurisé)
      req.formData = async () => ({
        get: () => null
      } as any);

      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(400);
    });

    it('🟢 doit autoriser un Administrateur (*) à modifier un autre Oiseau (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'admin_bird', capabilities: ['*'] }
      } as any);

      const mockFile = {
        name: 'test.png',
        type: 'image/png',
        size: 1000,
        arrayBuffer: async () => new ArrayBuffer(8)
      };

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.formData = async () => ({
        get: (key: string) => {
          if (key === 'file') return mockFile;
          if (key === 'imageType') return 'avatarUrl';
          return null;
        }
      } as any);

      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(201);
      expect(uploadSpy).toHaveBeenCalled();
    });

    it('🟢 doit téléverser l’avatar et propager à Mongo/Neo4j pour soi-même (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'bird_slug_1' }
      } as any);

      const mockFile = {
        name: 'test.png',
        type: 'image/png',
        size: 1000,
        arrayBuffer: async () => new ArrayBuffer(8)
      };

      const req = new Request('http://localhost/api', { method: 'POST' });
      req.formData = async () => ({
        get: (key: string) => {
          if (key === 'file') return mockFile;
          if (key === 'imageType') return 'avatarUrl';
          return null;
        }
      } as any);

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.publicUrl).toBe("http://cloud.com/avatar.png");
      expect(uploadSpy).toHaveBeenCalled();
      expect(mockFindOneAndUpdateLeanFn).toHaveBeenCalled();
      expect(mockNeo4jRun).toHaveBeenCalled();
    });
  });

  describe('Désintégration de l’Apparence (DELETE)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si l’Oiseau tente de désintégrer l’image d’un autre (403)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'other_bird' } } as any);

      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(403);
    });

    it('🟢 doit désintégrer physiquement l’image et nettoyer Mongo/Neo4j pour soi-même (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'bird_slug_1' } } as any);

      const req = new Request('http://localhost/api', { method: 'DELETE' });
      // Détournement sécurisé de req.json() sans instancier un corps de requête complexe
      req.json = async () => ({ imageType: 'avatarUrl', url: 'http://cloud.com/avatar.png' });

      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalled();
      expect(mockUpdateOne).toHaveBeenCalled();
      expect(mockNeo4jRun).toHaveBeenCalled();
    });
  });
});