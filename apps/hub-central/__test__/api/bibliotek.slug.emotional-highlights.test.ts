import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bibliotek/[slug]/emotional-highlights/route';
import { LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
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

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    LibraryBookModel: { findOne: vi.fn() },
    findEntityBySlugOrUid: vi.fn(),
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: { params: Promise<{ slug?: string | string[] }> }) => Promise<Response>;

describe('API Bibliotek - Surlignages Émotionnels ([slug]/emotional-highlights)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ CORRECTION CRITIQUE : Le mock respecte dorénavant scrupuleusement l'interface EmotionalHighlightResult
    vi.spyOn(BibliotekOrchestrator.prototype, 'addEmotionalHighlight').mockResolvedValue({
      success: true,
      highlight: { 
        uid: 'emo_mocked_123',
        readerUid: 'bird_reader',
        selectedText: 'Une phrase sublime.',
        emotion: '<(:<',
        comment: 'Magnifique !',
        isScholarSealed: false,
        createdAt: new Date()
      },
      book: {} as any
    });
  });

  it('🟢 GET : doit retourner uniquement les Notes d\'Érudits (isScholarSealed: true) pour un visiteur public', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'book_123',
      authorUid: 'author_1',
      emotionalHighlights: [
        { uid: 'emo_1', isScholarSealed: false, emotion: '🔥', createdAt: new Date() },
        { uid: 'emo_2', isScholarSealed: true, emotion: '<(:<', createdAt: new Date() },
      ]
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/mon-livre/emotional-highlights');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'mon-livre' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.isPrivateView).toBe(false);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].emotion).toBe('<(:<');
  });

  it('🟢 GET : doit retourner toutes les fulgurances (publiques et privées) à l\'auteur de l\'ouvrage', async () => {
    global.__mockUser = { uid: 'author_1', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'book_123',
      authorUid: 'author_1',
      emotionalHighlights: [
        { uid: 'emo_1', isScholarSealed: false, emotion: '🔥', createdAt: new Date() },
        { uid: 'emo_2', isScholarSealed: true, emotion: '<(:<', createdAt: new Date() },
      ]
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/mon-livre/emotional-highlights');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'mon-livre' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.isPrivateView).toBe(true);
    expect(json.data).toHaveLength(2); // L'auteur voit tout
  });

  it('🔴 POST : doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    const req = new NextRequest('http://localhost:3000/api/bibliotek/mon-livre/emotional-highlights', {
      method: 'POST',
      body: JSON.stringify({ selectedText: 'Texte', emotion: '🔥' })
    });

    const res = await postHandler(req, { params: Promise.resolve({ slug: 'mon-livre' }) });
    expect(res.status).toBe(401);
  });

  it('🟢 POST : doit transmettre l\'émotion à l\'orchestrateur et retourner (201)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/bibliotek/mon-livre/emotional-highlights', {
      method: 'POST',
      body: JSON.stringify({ 
        selectedText: 'Une phrase sublime.', 
        emotion: '<(:<',
        comment: 'Magnifique !'
      })
    });

    const res = await postHandler(req, { params: Promise.resolve({ slug: 'mon-livre' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.emotion).toBe('<(:<');
    expect(json.data.uid).toBe('emo_mocked_123');
    expect(BibliotekOrchestrator.prototype.addEmotionalHighlight).toHaveBeenCalled();
  });
});