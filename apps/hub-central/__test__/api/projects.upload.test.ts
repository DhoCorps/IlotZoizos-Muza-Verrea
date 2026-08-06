import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/projects/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

// Mock S3
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue(true)
  })),
  PutObjectCommand: vi.fn()
}));

// Mock StorageService
vi.mock('../../../../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mock-key.png'),
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key.png'),
    deleteFile: vi.fn().mockResolvedValue(true)
  }
}));

const mockRun = vi.fn().mockResolvedValue({ records: [{ get: () => 'bird_1' }] });
const mockFindOneAndUpdate = vi.fn();
const mockUpdateOne = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mockRun,
    close: vi.fn()
  })),
  ProjectModel: {
    findOneAndUpdate: vi.fn().mockImplementation(() => ({ lean: mockFindOneAndUpdate })),
    updateOne: (...args: any[]) => mockUpdateOne(...args)
  }
}));

describe('API Projects - Upload (/api/projects/[projectId]/upload)', () => {
  const mockParams = { params: Promise.resolve({ projectId: 'proj_1' }) };

  beforeEach(() => { vi.clearAllMocks(); });

  it('🔴 POST : doit rejeter si l\'oiseau n\'est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api', { method: 'POST' });
    const res = await POST(req, mockParams);
    expect(res.status).toBe(401);
  });

 it('🟢 POST : doit téléverser l\'artefact avec succès (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: ['*'] } } as any);
    mockFindOneAndUpdate.mockResolvedValueOnce({ uid: 'proj_1', documents: [] });
    
    // 🪡 SUTURE ABSOLUE : Un mock de formData() qui retourne un objet avec une méthode .get()
    const req = new Request('http://localhost/api', { method: 'POST' });
    req.formData = async () => ({
      get: (key: string) => {
        if (key === 'file') {
          return {
            name: 'test.png',
            type: 'image/png',
            size: 1024,
            arrayBuffer: async () => new ArrayBuffer(10)
          };
        }
        if (key === 'label') return 'Mon Document';
        return null;
      }
    } as any);

    const res = await POST(req, mockParams);
    expect(res.status).toBe(201);
  });
  
  it('🟢 DELETE : doit désintégrer l\'artefact (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: ['*'] } } as any);
    mockUpdateOne.mockResolvedValueOnce(true);
    
    const req = new Request('http://localhost/api', { 
      method: 'DELETE', 
      body: JSON.stringify({ key: 'http://cloud.com/mock-key.png' }) 
    });
    const res = await DELETE(req, mockParams);
    expect(res.status).toBe(200);
  });
});