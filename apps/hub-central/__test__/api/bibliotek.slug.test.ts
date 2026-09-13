import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/bibliotek/[slug]/route';
import { LibraryBookModel } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  LibraryBookModel: {
    findOne: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Bibliotek - Ouvrage Individuel ([slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    vi.spyOn(BibliotekOrchestrator.prototype, 'updateBook').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: { uid: 'book_999', title: 'Titre Muté' },
      neo4j: {}
    } as any);

    vi.spyOn(BibliotekOrchestrator.prototype, 'disintegrateBook').mockResolvedValue({
      success: true,
      purgedCount: 1,
      filesToDelete: []
    } as any);
  });

  it('🟢 GET : doit retourner les détails d’un ouvrage par son slug', async () => {
    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'book_999', title: 'Essai sur la Silice', authorUid: 'bird_writer', copyrightClaimed: true })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice');
    const res = await GET(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe('Essai sur la Silice');
  });

  it('🔴 PUT : doit rejeter (401) si l’Oiseau n’est pas authentifié', async () => {
    delete (global as any).__mockUser;

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Nouveau Titre' })
    });

    const res = await PUT(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    expect(res.status).toBe(401);
  });

  it('🟢 PUT : doit muter l’ouvrage avec succès (200)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Titre Muté' })
    });

    const res = await PUT(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.mongo.title).toBe('Titre Muté');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-essai-sur-la-silice');
  });

  it('🟢 DELETE : doit dissoudre l’ouvrage avec succès (200)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'DELETE'
    });

    const res = await DELETE(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-essai-sur-la-silice');
  });
});