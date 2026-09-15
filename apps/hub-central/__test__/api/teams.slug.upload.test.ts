import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/teams/[slug]/upload/route';
import { TeamModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
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
    TeamModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global {
  var __mockUser: any;
}

describe('Route API : Nid Artefacts & Sceau Cryptographique (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // Espions actifs sur le storageService mis à jour
    vi.spyOn(storageService, 'generateKey').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicUrl: 'https://cdn.ilot/file.jpg', key: 'mock-key' } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as any);

    // Mocks des méthodes Mongoose de TeamModel
    vi.mocked(TeamModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 't-1', documents: [] }),
    } as any);

    vi.mocked(TeamModel.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
  });

  it('POST - doit téléverser un fichier, sceller le SHA-256 et valider l\'autorisation', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    
    // Simulation du helper unifié par slug ou uid
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 't-1'
    } as any);

    // Mock Neo4j pour hasCapability
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.UPLOAD] }] }),
      close: vi.fn(),
    } as any);

    const formData = new FormData();
    formData.append('file', new Blob(['test-contenu-nid'], { type: 'image/jpeg' }), 'test.jpg');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const response = await POST(req as any, { params: Promise.resolve({ slug: 't-1' }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.url).toBe('https://cdn.ilot/file.jpg');
    expect(data.digitalSignature).toBeDefined();
    expect(typeof data.digitalSignature).toBe('string');
    expect(data.digitalSignature.length).toBe(64); // Vérification de la signature SHA-256
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 't-1');
    expect(revalidateTag).toHaveBeenCalledWith('team-t-1');
  });

  it('DELETE - doit supprimer un fichier si autorisé', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 't-1'
    } as any);

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
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 't-1');
    expect(storageService.deleteFile).toHaveBeenCalled();
  });
});