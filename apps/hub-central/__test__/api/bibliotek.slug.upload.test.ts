import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/bibliotek/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    LibraryBookModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
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

describe('API Bibliotek - Upload et Coffre R2 ([slug]/upload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    vi.spyOn(storageService, 'generateKey').mockReturnValue('mock-book-key.epub');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/books/essai.epub',
      key: 'mock-book-key.epub',
    } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-book-key.epub');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as any);
  });

  it('🟢 POST : doit réussir l’upload d’un manuscrit, forger le Sceau SHA-256 et mettre à jour l’ouvrage (201)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'book_999', 
      slug: 'essai-sur-la-silice',
      title: 'Essai sur la Silice', 
      authorUid: 'bird_writer' 
    } as any);

    vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'book_999', fileUrl: 'https://cdn.ilot/books/essai.epub' })
    } as any);

    const formData = new FormData();
    formData.append('file', new Blob(['contenu-epub'], { type: 'application/epub+zip' }), 'essai.epub');
    formData.append('assetType', 'manuscript');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const res = await POST(req as any, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://cdn.ilot/books/essai.epub');
    expect(json.digitalSignature).toBeDefined();
    expect(typeof json.digitalSignature).toBe('string');
    expect(json.digitalSignature.length).toBe(64); // Validation SHA-256
    
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
    } as any);

    const req = new NextRequest('http://localhost/api/bibliotek/essai-sur-la-silice/upload?url=https://cdn.ilot/books/essai.epub', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
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

  it('🔴 DELETE : doit rejeter (403) si l’URL fournie n’appartient pas à l’ouvrage (Protection IDOR)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'book_999', 
      slug: 'essai-sur-la-silice',
      authorUid: 'bird_writer', 
      fileUrl: 'https://cdn.ilot/books/essai.epub' 
    } as any);

    // Tentative de suppression d'une URL arbitraire étrangère
    const req = new NextRequest('http://localhost/api/bibliotek/essai-sur-la-silice/upload?url=https://cdn.ilot/books/volée-par-un-intrus.epub', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain("Souveraineté brisée");
    // Le vaporisateur R2 ne doit surtout pas s'être déclenché !
    expect(storageService.deleteFile).not.toHaveBeenCalled();
    expect(LibraryBookModel.updateOne).not.toHaveBeenCalled();
  });
});