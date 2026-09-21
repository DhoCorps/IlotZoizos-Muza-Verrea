import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/bibliotek/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards'; // 🛡️ Import explicite

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: 'Accès non autorisé.' }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
    withRateLimit: (_actionKey: string, _max: number, _window: number, handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
      if (rateLimitResult && rateLimitResult.allowed === false) {
        return NextResponse.json({ success: false, error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
      }
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: 'Accès non autorisé.' }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
  };
});

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    LibraryBookModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    },
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
  // 🛡️ Harmonisation stricte de la signature d'index
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: { params: Promise<{ slug?: string | string[] }> }) => Promise<Response>;

describe('API Bibliotek - Upload et Coffre R2 ([slug]/upload)', () => {
  const postHandler = POST as unknown as RouteHandler;
  const deleteHandler = DELETE as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(storageService, 'generateKey').mockReturnValue('mock-book-key.epub');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/books/essai.epub',
      key: 'mock-book-key.epub',
    } as unknown as Awaited<ReturnType<typeof storageService.uploadFile>>);

    vi.spyOn(storageService, 'extractKeyFromUrl').mockImplementation((url: string) => {
      if (url.includes('volée') || url.includes('etrangere')) {
        return 'foreign-key';
      }
      return 'mock-book-key.epub';
    });

    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as unknown as Awaited<ReturnType<typeof storageService.deleteFile>>);
  });

  it('🟢 POST : doit réussir l’upload d’un manuscrit, forger le Sceau SHA-256 et mettre à jour l’ouvrage (201)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'book_999', 
      slug: 'essai-sur-la-silice',
      title: 'Essai sur la Silice', 
      authorUid: 'bird_writer' 
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'book_999', fileUrl: 'https://cdn.ilot/books/essai.epub' })
    } as unknown as ReturnType<typeof LibraryBookModel.findOneAndUpdate>);

    const formData = new FormData();
    formData.append('file', new Blob(['contenu-epub'], { type: 'application/epub+zip' }), 'essai.epub');
    formData.append('assetType', 'manuscript');

    const req = new NextRequest('http://localhost/api/bibliotek/essai-sur-la-silice/upload', {
      method: 'POST',
    });

    // 🛡️ Suture absolue : On mocke directement la méthode formData() au niveau du prototype de la requête
    vi.spyOn(req, 'formData').mockResolvedValue(formData);

    const res = await postHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://cdn.ilot/books/essai.epub');
    expect(json.digitalSignature).toBeDefined();
    expect(typeof json.digitalSignature).toBe('string');
    expect(json.digitalSignature.length).toBe(64);
    
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(LibraryBookModel, 'essai-sur-la-silice');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-essai-sur-la-silice');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-book_999');
  });

  it('🟢 DELETE : doit purger l’artefact du cloud et nettoyer la Silice (200)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'book_999', 
      slug: 'essai-sur-la-silice',
      authorUid: 'bird_writer', 
      fileUrl: 'https://cdn.ilot/books/essai.epub' 
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/bibliotek/essai-sur-la-silice/upload?url=https://cdn.ilot/books/essai.epub', {
      method: 'DELETE',
    });

    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(LibraryBookModel, 'essai-sur-la-silice');
    expect(storageService.deleteFile).toHaveBeenCalledWith('mock-book-key.epub');
    expect(LibraryBookModel.updateOne).toHaveBeenCalledWith(
      { uid: 'book_999' },
      { $set: { fileUrl: '' } }
    );
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
  });

  it('🔴 DELETE : doit rejeter (403) en cas de tentative IDOR sur une URL étrangère normalisée', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'book_999', 
      slug: 'essai-sur-la-silice',
      authorUid: 'bird_writer', 
      fileUrl: 'https://cdn.ilot/books/essai.epub' 
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/bibliotek/essai-sur-la-silice/upload?url=https://cdn.ilot/books/volée-par-un-intrus.epub', {
      method: 'DELETE',
    });

    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain("Souveraineté brisée");
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(LibraryBookModel.updateOne).not.toHaveBeenCalled();
  });
});