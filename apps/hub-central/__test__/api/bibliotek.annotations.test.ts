import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bibliotek/annotations/route';
import { AnnotationModel } from '@ilot/infrastructure';
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
  AnnotationModel: {
    find: vi.fn(),
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Bibliotek - Annotations Collection (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 GET : doit lister les annotations', async () => {
    vi.mocked(AnnotationModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'annot_1', selectedText: 'Citation test' }])
      })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/annotations');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('🔴 POST : doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    delete (global as any).__mockUser;

    const req = new NextRequest('http://localhost:3000/api/bibliotek/annotations', {
      method: 'POST',
      body: JSON.stringify({ bookUid: 'b1', bookTitle: 'Livre', selectedText: 'Test' })
    });

    const res = await POST(req, {} as any);
    expect(res.status).toBe(401);
  });

  it('🟢 POST : doit sédimenter une annotation avec succès (201)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    vi.mocked(AnnotationModel.create).mockResolvedValueOnce({
      uid: 'annot_new',
      selectedText: 'Le conatus persiste',
      importance: 3
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/annotations', {
      method: 'POST',
      body: JSON.stringify({
        bookUid: 'book_999',
        bookTitle: 'Spinoza',
        selectedText: 'Le conatus persiste',
        importance: 3
      })
    });

    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('annot_new');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-annotations');
  });
});