import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bibliotek/route';
import { LibraryBookModel } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

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
    withOptionalAura: (handler: unknown) => async (req: NextRequest, context: unknown) => {
      // @ts-ignore
      return await handler(req, context, global.__mockUser);
    },
    withAura: (handler: unknown) => async (req: NextRequest, context: unknown) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: 'Accès non autorisé.' }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
  };
});

vi.mock('@ilot/infrastructure', () => ({
  LibraryBookModel: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/shared-core')>();
  return {
    ...actual,
    NotificationOrchestrator: vi.fn().mockImplementation(() => ({
      fosterNotification: vi.fn().mockResolvedValue({ success: true })
    }))
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: unknown) => Promise<Response>;

describe('API Bibliotek - Collection (GET / POST)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(BibliotekOrchestrator.prototype, 'fosterBook').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: {
        uid: 'book_new_123',
        title: 'Essai sur la Silice',
        digitalSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        timestampedAt: new Date(),
        status: 'PUBLISHED',
        economy: { priceCents: 1500, gachaTier: 'rare', barterAllowed: true, rights: { allowBarter: true } }
      },
      neo4j: {}
    } as unknown as Awaited<ReturnType<BibliotekOrchestrator['fosterBook']>>);
  });

  it('🟢 GET : doit lister UNIQUEMENT les ouvrages PUBLISHED pour le flux public (Visiteurs)', async () => {
    vi.mocked(LibraryBookModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
        })
      })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek?writingType=essai');
    await getHandler(req, {});
    
    // Le filtre 'status: PUBLISHED' est forcé
    expect(LibraryBookModel.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'PUBLISHED' }));
  });

  it('🟢 GET : doit permettre à un auteur de consulter ses brouillons (DRAFT) dans son Studio', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(LibraryBookModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
        })
      })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek?authorUid=bird_writer&status=DRAFT');
    await getHandler(req, {});
    
    // L'Oiseau identifié peut voir ses propres brouillons
    expect(LibraryBookModel.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'DRAFT', authorUid: 'bird_writer' }));
  });

  it('🔴 POST : doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    const req = new NextRequest('http://localhost:3000/api/bibliotek', {
      method: 'POST',
      body: JSON.stringify({ title: 'Mon Roman', fileUrl: 'cdn://roman.epub' })
    });

    const res = await postHandler(req, {});
    expect(res.status).toBe(401);
  });

  it('🟢 POST : doit sédimenter l’ouvrage avec statuts et économie', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/bibliotek', {
      method: 'POST',
      body: JSON.stringify({ 
        title: 'Essai sur la Silice', 
        fileUrl: 'https://cdn.ilot/books/essai.epub',
        status: 'PUBLISHED',
        economy: { priceCents: 1500, gachaTier: 'rare' }
      })
    });

    const res = await postHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('PUBLISHED');
  });
});