import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/users/[slug]/upload/route';
import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'bird_123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: Function) => async (req: NextRequest, context: unknown) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, message: "Trop de requêtes." }, { status: 429 });
    }
    const mockUser = global.__mockUser || { uid: 'bird_123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
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
    OiseauModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

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

describe('API Route : Upload Avatar avec Sceau Cryptographique (POST / DELETE /api/users/[slug]/upload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(storageService, 'generateKey').mockReturnValue('users/bird_123/avatar.png');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicUrl: 'https://cdn.ilot/avatar.png', key: 'users/bird_123/avatar.png' } as unknown as Awaited<ReturnType<typeof storageService.uploadFile>>);
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as unknown as Awaited<ReturnType<typeof storageService.deleteFile>>);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockImplementation((url: string) => {
      if (url.includes('etranger')) return 'foreign-key.png';
      if (url.includes('old-avatar')) return 'old-key.png';
      return 'users/bird_123/avatar.png';
    });
  });

  it('🟢 doit téléverser l\'image, purger l\'ancienne (Garbage Collection) et générer le Sceau SHA-256', async () => {
    global.__mockUser = { uid: 'bird_123', capabilities: ['*'] };

    // Simulation du helper unifié
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'bird_123',
      slug: 'bird-test',
      avatarUrl: 'https://cdn.ilot/old-avatar.png',
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'bird_123',
        pseudo: 'Oiseau Sélénite',
        avatarUrl: 'https://cdn.ilot/avatar.png',
      }),
    } as unknown as ReturnType<typeof OiseauModel.findOneAndUpdate>);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    } as unknown as ReturnType<typeof getNeo4jSession>);

    const formData = new FormData();
    const file = new Blob(['contenu image test'], { type: 'image/png' });
    formData.append('file', file, 'avatar.png');
    formData.append('imageType', 'avatarUrl');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const response = await POST(req, { params: Promise.resolve({ slug: 'bird-test' }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.publicUrl).toBe('https://cdn.ilot/avatar.png');
    expect(data.digitalSignature).toBeDefined();
    expect(typeof data.digitalSignature).toBe('string');
    expect(data.digitalSignature.length).toBe(64);

    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'bird-test');
    expect(storageService.deleteFile).toHaveBeenCalledWith('old-key.png');
    expect(revalidateTag).toHaveBeenCalledWith('profile-bird-test');
  });

  it('🔴 DELETE - doit rejeter (403) en cas de tentative IDOR sur une URL étrangère normalisée', async () => {
    global.__mockUser = { uid: 'bird_123', capabilities: ['*'] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'bird_123',
      slug: 'bird-test',
      avatarUrl: 'https://cdn.ilot/avatar.png',
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/bird-test/upload', {
      method: 'DELETE',
      body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://cdn.ilot/avatar-etranger.png' }),
    });

    const response = await DELETE(req, { params: Promise.resolve({ slug: 'bird-test' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Souveraineté brisée');
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(OiseauModel.updateOne).not.toHaveBeenCalled();
  });
});