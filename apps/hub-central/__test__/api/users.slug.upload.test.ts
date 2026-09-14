import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/users/[slug]/upload/route';
import { NextRequest } from 'next/server';
import { OiseauModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
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
  };
});

// Adaptation du mock sur generateKey au lieu de generateStructuredKey
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

declare global {
  var __mockUser: any;
}

describe('API Route : Upload Avatar avec Sceau Cryptographique (POST /api/users/[slug]/upload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 doit téléverser l\'image, purger l\'ancienne (Garbage Collection) et générer le Sceau SHA-256', async () => {
    global.__mockUser = { uid: 'bird_123', capabilities: ['*'] };

    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'bird_123',
        slug: 'bird-test',
        avatarUrl: 'https://cdn.ilot/old-avatar.png',
      }),
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

    expect(storageService.deleteFile).toHaveBeenCalledWith('old-key.png');
    expect(revalidateTag).toHaveBeenCalledWith('profile-bird-test');
  });
});