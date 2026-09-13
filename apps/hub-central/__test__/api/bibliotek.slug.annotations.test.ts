import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bibliotek/[slug]/annotations/route';
import { AnnotationModel, LibraryBookModel } from '@ilot/infrastructure';
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
  AnnotationModel: {
    find: vi.fn(),
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Bibliotek - Sous-route Annotations ([slug]/annotations)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 GET : doit lister les notes associées au livre par son slug', async () => {
    // 🪡 Suture du .lean() chaînable sur le mock findOne
    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'book_999',
        title: 'Traité'
      })
    } as any);

    vi.mocked(AnnotationModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'annot_1', selectedText: 'Extrait Spinoza' }])
      })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/traite/annotations');
    const res = await GET(req, { params: Promise.resolve({ slug: 'traite' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].selectedText).toBe('Extrait Spinoza');
  });

  it('🟢 POST : doit créer une note rattachée au livre résolu par son slug (201)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    // 🪡 Suture du .lean() chaînable sur le mock findOne
    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'book_999',
        title: 'Traité de Philosophie'
      })
    } as any);

    vi.mocked(AnnotationModel.create).mockResolvedValueOnce({
      uid: 'annot_new',
      selectedText: 'Le conatus persiste',
      importance: 2
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/traite/annotations', {
      method: 'POST',
      body: JSON.stringify({
        selectedText: 'Le conatus persiste',
        importance: 2,
        comment: 'Remarque essentielle'
      })
    });

    const res = await POST(req, { params: Promise.resolve({ slug: 'traite' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('annot_new');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-annotations');
  });
});