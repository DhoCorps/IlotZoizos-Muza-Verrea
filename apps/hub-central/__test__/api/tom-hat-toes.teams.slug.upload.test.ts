import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/tom-hat-toes/teams/[slug]/upload/route';
import { TeamModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { CAPABILITIES } from '@ilot/types';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

// Mocks unifiés des api-guards
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: Function) => async (req: NextRequest, context: unknown) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, message: "Trop de requêtes." }, { status: 429 });
    }
    return await handler(req, context);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, message: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
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
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('Route API : Nid Artefacts & Sceau Cryptographique (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(storageService, 'generateKey').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicUrl: 'https://cdn.ilot/file.jpg', key: 'mock-key' } as unknown as Awaited<ReturnType<typeof storageService.uploadFile>>);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockImplementation((url: string) => {
      if (url.includes('etranger')) return 'foreign-key';
      return 'mock-key';
    });
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as unknown as Awaited<ReturnType<typeof storageService.deleteFile>>);

    vi.mocked(TeamModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 't-1', documents: [] }),
    } as unknown as ReturnType<typeof TeamModel.findOneAndUpdate>);

    vi.mocked(TeamModel.updateOne).mockResolvedValue({ modifiedCount: 1 } as unknown as Awaited<ReturnType<typeof TeamModel.updateOne>>);
  });

  it('POST - doit téléverser un fichier, sceller le SHA-256 et valider l\'autorisation', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 't-1',
      slug: 't-1'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.UPLOAD] }] }),
      close: vi.fn(),
    } as unknown as ReturnType<typeof getNeo4jSession>);

    const formData = new FormData();
    formData.append('file', new Blob(['test-contenu-nid'], { type: 'image/jpeg' }), 'test.jpg');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await POST(req, { params: Promise.resolve({ slug: 't-1' }) });
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
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.BURN] }] }),
      close: vi.fn(),
    } as unknown as ReturnType<typeof getNeo4jSession>);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/t-1/upload', { 
        method: 'DELETE', 
        body: JSON.stringify({ key: 'https://cdn.ilot/document-etranger.jpg' }) 
    });

    const response = await DELETE(req, { params: Promise.resolve({ slug: 't-1' }) });
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
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [{ get: () => [CAPABILITIES.FILE.BURN] }] }),
      close: vi.fn(),
    } as unknown as ReturnType<typeof getNeo4jSession>);

    const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/t-1/upload', { 
        method: 'DELETE', 
        body: JSON.stringify({ key: 'https://cdn.ilot/file.jpg' }) 
    });

    const response = await DELETE(req, { params: Promise.resolve({ slug: 't-1' }) });
    expect(response.status).toBe(200);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 't-1');
    expect(storageService.deleteFile).toHaveBeenCalled();
  });
});