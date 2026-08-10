import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/sujets/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('hub-central/fr/projects/mon-sujet/sujet_media/test.jpg'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot/media.jpg', key: 'mock-key' }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Abyss Upload & Delete Sujet Media (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('POST - doit téléverser un média, respecter la structure et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    const formData = new FormData();
    formData.append('file', new Blob(['binary data'], { type: 'image/jpeg' }), 'test.jpg');

    const req = new Request('http://localhost/api/sujets/mon-sujet/upload', {
      method: 'POST',
      body: formData,
    });

    vi.spyOn(req, 'formData').mockResolvedValue(formData);

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
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'u-123', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/sujets/mon-sujet/upload?url=https://cdn.ilot/media.jpg', {
      method: 'DELETE',
    });

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