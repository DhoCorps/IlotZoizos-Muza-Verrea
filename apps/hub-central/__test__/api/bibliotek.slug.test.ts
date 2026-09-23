import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/bibliotek/[slug]/route';
import { LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
import { getCachedBook } from '@/lib/cache/bibliotek.cache';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/cache/bibliotek.cache', () => ({
  getCachedBook: vi.fn(),
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withOptionalAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      // @ts-ignore
      return await handler(req, context, global.__mockUser);
    },
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
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
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

// 🌿 MOCK PRÉVENTIF DE LA CANOPÉE POUR ISOLER L'ORCHESTRATEUR
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

type RouteHandler = (req: NextRequest, ctx: { params: Promise<{ slug?: string | string[] }> }) => Promise<Response>;

describe('API Bibliotek - Ouvrage Individuel ([slug]) & Statuts', () => {
  const getHandler = GET as unknown as RouteHandler;
  const putHandler = PUT as unknown as RouteHandler;
  const deleteHandler = DELETE as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(BibliotekOrchestrator.prototype, 'updateBook').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: { 
        uid: 'book_999', 
        slug: 'essai-sur-la-silice-mut', 
        title: 'Titre Muté',
        status: 'PUBLISHED',
        economy: { priceCents: 2500, gachaTier: 'legendary' }
      },
      neo4j: {}
    } as unknown as Awaited<ReturnType<BibliotekOrchestrator['updateBook']>>);

    vi.spyOn(BibliotekOrchestrator.prototype, 'disintegrateBook').mockResolvedValue({
      success: true,
      purgedCount: 1,
    } as unknown as Awaited<ReturnType<BibliotekOrchestrator['disintegrateBook']>>);
  });

  it('🟢 GET : doit retourner les détails d’un ouvrage PUBLISHED via le cache pour un visiteur', async () => {
    vi.mocked(getCachedBook).mockResolvedValueOnce({ 
      uid: 'book_999', 
      title: 'Essai sur la Silice', 
      authorUid: 'bird_writer', 
      status: 'PUBLISHED',
      toObject: () => ({ uid: 'book_999', title: 'Essai sur la Silice', authorUid: 'bird_writer', status: 'PUBLISHED' })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(getCachedBook).toHaveBeenCalledWith('essai-sur-la-silice');
    expect(json.title).toBe('Essai sur la Silice');
  });

  it('🔴 GET : doit rejeter (403) l’accès à un DRAFT si le visiteur n’est pas l’auteur', async () => {
    vi.mocked(getCachedBook).mockResolvedValueOnce({ 
      uid: 'book_999', 
      title: 'Brouillon Secret', 
      authorUid: 'bird_writer', 
      status: 'DRAFT',
      toObject: () => ({ uid: 'book_999', title: 'Brouillon Secret', authorUid: 'bird_writer', status: 'DRAFT' })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/brouillon-secret');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'brouillon-secret' }) });
    
    expect(res.status).toBe(403);
  });

  it('🟢 GET : doit autoriser l’accès à un DRAFT si le visiteur est l’auteur', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(getCachedBook).mockResolvedValueOnce({ 
      uid: 'book_999', 
      title: 'Brouillon Secret', 
      authorUid: 'bird_writer', 
      status: 'DRAFT',
      toObject: () => ({ uid: 'book_999', title: 'Brouillon Secret', authorUid: 'bird_writer', status: 'DRAFT' })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/brouillon-secret');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'brouillon-secret' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe('Brouillon Secret');
  });

  it('🔴 PUT : doit rejeter (401) si l’Oiseau n’est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Nouveau Titre' })
    });

    const res = await putHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    expect(res.status).toBe(401);
  });

  it('🟢 PUT : doit muter l’ouvrage avec succès (200) y compris son statut de publication', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'book_canonique_123', 
      slug: 'essai-sur-la-silice',
      authorUid: 'bird_writer' 
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'PUT',
      body: JSON.stringify({ 
        title: 'Titre Muté',
        status: 'PUBLISHED',
        economy: {
          priceCents: 2500,
          gachaTier: 'legendary'
        }
      })
    });

    const res = await putHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.mongo.title).toBe('Titre Muté');
    expect(json.mongo.status).toBe('PUBLISHED');
    expect(BibliotekOrchestrator.prototype.updateBook).toHaveBeenCalledWith('book_canonique_123', expect.any(Object), expect.any(Object));
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-essai-sur-la-silice');
  });

  it('🟢 DELETE : doit dissoudre l’ouvrage avec succès (200) avec son UID canonique', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'book_canonique_123', 
      slug: 'essai-sur-la-silice',
      authorUid: 'bird_writer' 
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'DELETE'
    });

    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(BibliotekOrchestrator.prototype.disintegrateBook).toHaveBeenCalledWith('book_canonique_123', expect.any(Object));
  });
});