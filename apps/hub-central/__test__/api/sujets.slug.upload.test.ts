import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/sujets/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { SujetModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

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

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    SujetModel: {
      findOne: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    },
    // Mock du helper unifié s'appuyant sur SujetModel.findOne
    findEntityBySlugOrUid: vi.fn(async (model, identifier, options = { lean: true }) => {
      const doc = await model.findOne({ $or: [{ slug: identifier }, { uid: identifier }] });
      if (!doc) return null;
      if (options.lean && typeof doc.lean === 'function') {
        return await doc.lean();
      }
      return doc;
    }),
  };
});

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
describe('Route API : Abyss Upload & Delete Sujet Media & Sceau SHA-256 (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // Espions actifs sur le SujetModel pour le helper unifié
    vi.spyOn(SujetModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ 
        uid: 's-1', 
        slug: 'mon-sujet', 
        authorUid: 'u-123',
        mediaUrl: 'https://cdn.ilot/media.jpg' 
      }),
    } as any);

    // 🛡️ Espions actifs sur le StorageService mis à jour
    vi.spyOn(storageService, 'generateKey').mockReturnValue('hub-central/fr/projects/s-1/sujet_media/test.jpg');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/media.jpg',
      key: 'mock-key',
    } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as any);
  });

  it('POST - doit téléverser un média, générer le Sceau SHA-256, respecter la structure et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const formData = new FormData();
    formData.append('file', new Blob(['binary data'], { type: 'image/jpeg' }), 'test.jpg');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://cdn.ilot/media.jpg');
    expect(json.data.digitalSignature).toBeDefined();
    expect(typeof json.data.digitalSignature).toBe('string');
    expect(json.data.digitalSignature.length).toBe(64); // Vérification du SHA-256

    // 💥 Vérification de l'invalidation du cache
    expect(revalidateTag).toHaveBeenCalledWith('sujets');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-s-1');
  });

  it('DELETE - doit rejeter (403) en cas de tentative IDOR sur une URL étrangère', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const req = new Request('http://localhost/api/sujets/mon-sujet/upload?url=https://cdn.ilot/url-etrangere.jpg', {
      method: 'DELETE',
    }) as unknown as NextRequest;

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    
    expect(response.status).toBe(403);
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(SujetModel.updateOne).not.toHaveBeenCalled();
  });

  it('DELETE - doit purger le média du stockage, nettoyer la Silice et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const req = new Request('http://localhost/api/sujets/mon-sujet/upload?url=https://cdn.ilot/media.jpg', {
      method: 'DELETE',
    }) as unknown as NextRequest;

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    expect(storageService.deleteFile).toHaveBeenCalledWith('mock-key');
    expect(SujetModel.updateOne).toHaveBeenCalledWith(
      { uid: 's-1' },
      { $set: { mediaUrl: null } }
    );

    // 💥 Vérification de l'invalidation du cache
    expect(revalidateTag).toHaveBeenCalledWith('sujets');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-s-1');
  });
});