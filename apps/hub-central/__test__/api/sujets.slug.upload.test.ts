import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/sujets/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// Mocks unifiés des api-guards incluant withRateLimit
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: Function) => async (req: NextRequest, context: unknown) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    SujetModel: {
      findOne: vi.fn(),
    },
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

// Mock de l'Orchestrator pour intercepter updateSujet
vi.mock('@ilot/shared-core', () => {
  return {
    SujetOrchestrator: class {
      async updateSujet() {
        return {
          success: true,
          status: 'success',
          mongo: { uid: 's-1', media: { coverImageUrl: 'https://cdn.ilot/media.jpg' } },
          neo4j: null,
        };
      }
      async disintegrateSujet() {
        return { success: true, purgedCount: 1 };
      }
    },
    IlotError: class extends Error {
      statusCode: number;
      constructor(message: string, code: string, status: number) {
        super(message);
        this.statusCode = status;
      }
    }
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

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Abyss Upload & Delete Sujet Media & Sceau SHA-256 (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(SujetModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ 
        uid: 's-1', 
        slug: 'mon-sujet', 
        authorUid: 'u-123',
        media: { coverImageUrl: 'https://cdn.ilot/media.jpg' }
      }),
    } as unknown as ReturnType<typeof SujetModel.findOne>);

    vi.spyOn(storageService, 'generateKey').mockReturnValue('hub-central/fr/projects/s-1/sujet_media/test.jpg');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/media.jpg',
      key: 'mock-key',
    } as unknown as Awaited<ReturnType<typeof storageService.uploadFile>>);

    vi.spyOn(storageService, 'extractKeyFromUrl').mockImplementation((url: string) => {
      if (url.includes('etrangere') || url.includes('foreign')) {
        return 'foreign-key';
      }
      return 'mock-key';
    });

    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as unknown as Awaited<ReturnType<typeof storageService.deleteFile>>);
  });

  it('POST - doit téléverser un média, générer le Sceau SHA-256, passer par l\'Orchestrator et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const formData = new FormData();
    formData.append('file', new Blob(['binary data'], { type: 'image/jpeg' }), 'test.jpg');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const response = await POST(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://cdn.ilot/media.jpg');
    expect(json.data.digitalSignature).toBeDefined();

    // Vérification de l'invalidation du cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('sujets');
    expect(revalidateTag).toHaveBeenCalledWith('abyss');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-s-1');
  });

  it('DELETE - doit rejeter (403) en cas de tentative IDOR sur une URL étrangère normalisée', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const req = new NextRequest('http://localhost/api/sujets/mon-sujet/upload?url=https://cdn.ilot/url-etrangere.jpg', {
      method: 'DELETE',
    });

    const response = await DELETE(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    
    expect(response.status).toBe(403);
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('DELETE - doit purger le média, passer par l\'Orchestrator et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const req = new NextRequest('http://localhost/api/sujets/mon-sujet/upload?url=https://cdn.ilot/media.jpg', {
      method: 'DELETE',
    });

    const response = await DELETE(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    expect(storageService.deleteFile).toHaveBeenCalledWith('mock-key');

    // Vérification de l'invalidation du cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('sujets');
    expect(revalidateTag).toHaveBeenCalledWith('abyss');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    expect(revalidateTag).toHaveBeenCalledWith('sujet-s-1');
  });
});