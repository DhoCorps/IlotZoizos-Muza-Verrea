import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/sujets/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// Neutralisation du bouclier withAura cohérente avec les autres tests
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
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

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Abyss Upload & Delete Sujet Media (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

    // 🛡️ Espions actifs sur le StorageService (Méthode validée)
    vi.spyOn(storageService, 'generateStructuredKey').mockReturnValue('hub-central/fr/projects/mon-sujet/sujet_media/test.jpg');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/media.jpg',
      key: 'mock-key',
    } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as any);
  });

  it('POST - doit téléverser un média, respecter la structure et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const formData = new FormData();
    formData.append('file', new Blob(['binary data'], { type: 'image/jpeg' }), 'test.jpg');

    // 🎯 LOI DU MULTIPART SOUVERAIN
    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://cdn.ilot/media.jpg');

    // 💥 Vérification de l'invalidation du cache
    expect(revalidateTag).toHaveBeenCalledWith('sujets');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
  });

  it('DELETE - doit purger le média du stockage et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const req = new Request('http://localhost/api/sujets/mon-sujet/upload?url=https://cdn.ilot/media.jpg', {
      method: 'DELETE',
    }) as unknown as NextRequest;

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    expect(storageService.deleteFile).toHaveBeenCalledWith('mock-key');

    // 💥 Vérification de l'invalidation du cache
    expect(revalidateTag).toHaveBeenCalledWith('sujets');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
  });
});