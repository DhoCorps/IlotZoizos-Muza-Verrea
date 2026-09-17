import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/teams/[slug]/upload/route';
import { TeamModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { CAPABILITIES } from '@ilot/types';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

// Mocks unifiés des api-guards
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: any) => async (req: any, context: any) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, message: "Trop de requêtes." }, { status: 429 });
    }
    return await handler(req, context);
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

    vi.spyOn(storageService, 'generateKey').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicUrl: 'https://cdn.ilot/file.jpg', key: 'mock-key' } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockImplementation((url: string) => {
      if (url.includes('etranger')) return 'foreign-key';
      return 'mock-key';
    });
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as any);

    vi.mocked(TeamModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 't-1', documents: [] }),
    } as any);

    vi.mocked(TeamModel.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
  });

  it('POST - doit téléverser un fichier, sceller le SHA-256 et valider l\'autorisation', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 't-1'
    } as any);

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
    expect(data.digitalSignature.length).toBe(64);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 't-1');
    expect(revalidateTag).toHaveBeenCalledWith('team-t-1');
  });

  it('DELETE - doit refuser (403) en cas de tentative IDOR sur une URL étrangère normalisée', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 't-1',
      documents: [{ url: 'https://cdn.ilot/file.jpg' }]
    } as any);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.BURN] }] }),
      close: vi.fn(),
    } as any);

    const req = new Request('http://localhost', { 
        method: 'DELETE', 
        body: JSON.stringify({ key: 'https://cdn.ilot/document-etranger.jpg' }) 
    }) as unknown as NextRequest;

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 't-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Souveraineté brisée');
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(TeamModel.updateOne).not.toHaveBeenCalled();
  });

  it('DELETE - doit supprimer un fichier si autorisé et si l\'artefact appartient au nid', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 't-1',
      documents: [{ url: 'https://cdn.ilot/file.jpg' }]
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