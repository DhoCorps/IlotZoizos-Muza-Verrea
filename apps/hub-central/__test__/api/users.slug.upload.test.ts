import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/users/[slug]/upload/route';
import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'bird_123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: any) => async (req: any, context: any) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, message: "Trop de requêtes." }, { status: 429 });
    }
    const mockUser = global.__mockUser || { uid: 'bird_123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
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

// Adaptation du mock sur generateKey
vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateKey: vi.fn(() => 'users/bird_123/avatar.png'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot/avatar.png' }),
    deleteFile: vi.fn().mockResolvedValue(true),
    extractKeyFromUrl: vi.fn(() => 'old-key.png'),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global {
  var __mockUser: any;
}

describe('API Route : Upload Avatar avec Sceau Cryptographique (POST / DELETE /api/users/[slug]/upload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 doit téléverser l\'image, purger l\'ancienne (Garbage Collection) et générer le Sceau SHA-256', async () => {
    global.__mockUser = { uid: 'bird_123', capabilities: ['*'] };

    // Simulation du helper unifié
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'bird_123',
      slug: 'bird-test',
      avatarUrl: 'https://cdn.ilot/old-avatar.png',
    } as any);

    vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'bird_123',
        pseudo: 'Oiseau Sélénite',
        avatarUrl: 'https://cdn.ilot/avatar.png',
      }),
    } as any);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    } as any);

    const formData = new FormData();
    const file = new Blob(['contenu image test'], { type: 'image/png' });
    formData.append('file', file, 'avatar.png');
    formData.append('imageType', 'avatarUrl');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'bird-test' }) });
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

  it('🔴 DELETE - doit rejeter (403) en cas de tentative IDOR sur une URL étrangère', async () => {
    global.__mockUser = { uid: 'bird_123', capabilities: ['*'] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'bird_123',
      slug: 'bird-test',
      avatarUrl: 'https://cdn.ilot/avatar.png',
    } as any);

    const req = new Request('http://localhost/api/users/bird-test/upload', {
      method: 'DELETE',
      body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://cdn.ilot/avatar-etranger.png' }),
    }) as unknown as NextRequest;

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'bird-test' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Souveraineté brisée');
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(OiseauModel.updateOne).not.toHaveBeenCalled();
  });
});