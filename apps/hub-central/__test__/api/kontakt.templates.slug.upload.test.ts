import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/kontakt/templates/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { NextResponse, NextRequest } from 'next/server';
import { CVTemplateModel, findEntityBySlugOrUid } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS MINIMAUX ET PRÉCIS
// -------------------------------------------------------------------------
// 🛡️ Mock crucial pour éviter l'erreur "static generation store missing in revalidateTag"
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: any) => async (req: any, context: any) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    CVTemplateModel: {
      findOne: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global { var __mockUser: any; }

describe('POST /api/kontakt/templates/[slug]/upload avec Sceau SHA-256', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    vi.spyOn(storageService, 'generateKey').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/doc.pdf',
      key: 'mock-key',
    } as any);

    // 🛡️ Simulation réaliste d'extraction de clé normalisée avec filtrage des URL étrangères
    vi.spyOn(storageService, 'extractKeyFromUrl').mockImplementation((url: string) => {
      if (url.includes('etrangere') || url.includes('foreign')) {
        return 'foreign-key';
      }
      return 'mock-key';
    });
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as any);
  });

  it('doit échouer (403) si le template n\'appartient pas à l\'Oiseau', async () => {
    global.__mockUser = { uid: 'u-intrus', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'tmpl_123',
      authorUid: 'u-123'
    } as any);

    const formData = new FormData();
    formData.append('file', new Blob(['content'], { type: 'image/jpeg' }), 'test.jpg');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-template' }) });
    
    expect(res.status).toBe(403);
  });

  it('doit réussir (201) l\'upload d\'un template, forger le Sceau SHA-256 et retourner les métadonnées', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'tmpl_123',
      slug: 'mon-template',
      authorUid: 'u-123'
    } as any);

    const formData = new FormData();
    formData.append('file', new Blob(['content'], { type: 'image/jpeg' }), 'test.jpg');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-template' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://cdn.ilot/doc.pdf');
    expect(json.data.digitalSignature).toBeDefined();
    expect(typeof json.data.digitalSignature).toBe('string');
    expect(json.data.digitalSignature.length).toBe(64); // Validation de l'empreinte SHA-256
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(CVTemplateModel, 'mon-template');
    
    // Vérification de la cascade d'invalidation (importée depuis `next/cache`)
    const { revalidateTag } = await import('next/cache');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt');
    expect(revalidateTag).toHaveBeenCalledWith('cv-templates');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-template-tmpl_123');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-template-mon-template');
  });

  it('DELETE - doit échouer (403) en cas de tentative IDOR sur une URL étrangère normalisée', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'tmpl_123',
      authorUid: 'u-123',
      previewUrl: 'https://cdn.ilot/doc.pdf'
    } as any);

    const req = new Request('http://localhost/api/kontakt/templates/mon-template/upload?url=https://cdn.ilot/url-etrangere.pdf', {
      method: 'DELETE',
    }) as unknown as NextRequest;

    const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-template' }) });
    expect(res.status).toBe(403);
    expect(storageService.deleteFile).not.toHaveBeenCalled();
  });

  it('DELETE - doit réussir (200) la purge sécurisée', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'tmpl_123',
      slug: 'mon-template',
      authorUid: 'u-123',
      previewUrl: 'https://cdn.ilot/doc.pdf'
    } as any);

    const req = new Request('http://localhost/api/kontakt/templates/mon-template/upload?url=https://cdn.ilot/doc.pdf', {
      method: 'DELETE',
    }) as unknown as NextRequest;

    const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-template' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(storageService.deleteFile).toHaveBeenCalledWith('mock-key');
    expect(CVTemplateModel.updateOne).toHaveBeenCalledWith(
      { uid: 'tmpl_123' },
      { $set: { previewUrl: null } }
    );
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(CVTemplateModel, 'mon-template');

    // Vérification de la cascade d'invalidation
    const { revalidateTag } = await import('next/cache');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt');
    expect(revalidateTag).toHaveBeenCalledWith('cv-templates');
  });
});