import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/teams/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';
import { CAPABILITIES } from '@ilot/types';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: { 
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ uid: 't-1' }) }),
    // 🪡 Ajout du chaînage .lean() sur findOneAndUpdate
    findOneAndUpdate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ uid: 't-1' }) }), 
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }) 
  },
  getNeo4jSession: vi.fn(),
}));
vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mock-key'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot/file.jpg' }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));
vi.mock('@/modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

describe('Route API : Nid Artefacts (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('POST - doit téléverser un fichier si autorisé', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123' } } as any);
    vi.mocked(TeamModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ uid: 't-1' }) } as any);
    
    // Mock Neo4j pour hasCapability
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.UPLOAD] }] }),
      close: vi.fn(),
    } as any);

    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');

    const req = new Request('http://localhost', { method: 'POST', body: formData });
    
    // Mock formData dans la requête
    vi.spyOn(req, 'formData').mockResolvedValue(formData);

    const response = await POST(req as any, { params: Promise.resolve({ slug: 't-1' }) });
    expect(response.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith('team-t-1');
  });

  it('DELETE - doit supprimer un fichier si autorisé', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123' } } as any);
    vi.mocked(TeamModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ uid: 't-1' }) } as any);
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.BURN] }] }),
      close: vi.fn(),
    } as any);

    const req = new Request('http://localhost', { 
        method: 'DELETE', 
        body: JSON.stringify({ key: 'mock-url' }) 
    });

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 't-1' }) });
    expect(response.status).toBe(200);
    expect(storageService.deleteFile).toHaveBeenCalled();
  });
});