import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/teams/[slug]/upload/route';
import { TeamModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';
import { CAPABILITIES } from '@ilot/types';
import { NextRequest } from 'next/server';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

// Neutralisation du bouclier withAura cohérente
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getNeo4jSession: vi.fn(),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

declare global {
  var __mockUser: any;
}

describe('Route API : Nid Artefacts (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

    // Espions actifs sur le storageService
    vi.spyOn(storageService, 'generateStructuredKey').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicUrl: 'https://cdn.ilot/file.jpg', key: 'mock-key' } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as any);

    // Espions actifs sur TeamModel (Mongoose)
    vi.spyOn(TeamModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 't-1', slug: 't-1' }),
    } as any);

    vi.spyOn(TeamModel, 'findOneAndUpdate').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 't-1', documents: [] }),
    } as any);

    vi.spyOn(TeamModel, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);
  });

  it('POST - doit téléverser un fichier si autorisé', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    
    // Mock Neo4j pour hasCapability
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.UPLOAD] }] }),
      close: vi.fn(),
    } as any);

    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');

    // Loi du multipart souverain
    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const response = await POST(req as any, { params: Promise.resolve({ slug: 't-1' }) });
    expect(response.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith('team-t-1');
  });

  it('DELETE - doit supprimer un fichier si autorisé', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.BURN] }] }),
      close: vi.fn(),
    } as any);

    const req = new Request('http://localhost', { 
        method: 'DELETE', 
        body: JSON.stringify({ key: 'https://cdn.ilot/file.jpg' }) 
    }) as unknown as NextRequest;

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 't-1' }) });
    expect(response.status).toBe(200);
    expect(storageService.deleteFile).toHaveBeenCalled();
  });
});