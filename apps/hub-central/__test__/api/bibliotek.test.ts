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

// 🌿 MOCK PRÉVENTIF : Empêche l'orchestrateur de tenter de charger la Canopée dans le vide
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
        economy: {
          priceCents: 1500,
          gachaTier: 'rare',
          barterAllowed: true,
          rights: { allowBarter: true }
        }
      },
      neo4j: {}
    } as unknown as Awaited<ReturnType<BibliotekOrchestrator['fosterBook']>>);
  });

  it('🟢 GET : doit lister les ouvrages de la bibliothèque avec métadonnées de pagination', async () => {
    vi.mocked(LibraryBookModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ uid: 'book_1', title: 'Le Livre des Sentiers' }])
          })
        })
      })
    } as unknown as ReturnType<typeof LibraryBookModel.find>);

    vi.mocked(LibraryBookModel.countDocuments).mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/bibliotek?writingType=essai&page=1&limit=10');
    const res = await getHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('Le Livre des Sentiers');
    expect(json.pagination).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    });
  });

  it('🔴 POST : doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost:3000/api/bibliotek', {
      method: 'POST',
      body: JSON.stringify({ title: 'Mon Roman', fileUrl: 'cdn://roman.epub' })
    });

    const res = await postHandler(req, {});
    expect(res.status).toBe(401);
  });

  it('🟢 POST : doit sédimenter l’ouvrage, accepter les métadonnées Gacha/Barter et retourner (201)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/bibliotek', {
      method: 'POST',
      body: JSON.stringify({ 
        title: 'Essai sur la Silice', 
        fileUrl: 'https://cdn.ilot/books/essai.epub',
        writingType: 'essai',
        style: 'philosophie',
        economy: {
          priceCents: 1500,
          gachaTier: 'rare',
          barterAllowed: true
        }
      })
    });

    const res = await postHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('book_new_123');
    expect(json.data.economy.priceCents).toBe(1500);
    expect(json.data.economy.gachaTier).toBe('rare');
    expect(json.digitalSignature).toHaveLength(64);
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-public');
  });
});