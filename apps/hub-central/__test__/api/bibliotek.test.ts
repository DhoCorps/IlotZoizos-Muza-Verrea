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
    find: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Bibliotek - Collection (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // Espionnage direct sur l'orchestrateur de Bibliotek
    vi.spyOn(BibliotekOrchestrator.prototype, 'fosterBook').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: {
        uid: 'book_new_123',
        title: 'Essai sur la Silice',
        digitalSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        timestampedAt: new Date(),
      },
      neo4j: {}
    } as any);
  });

  it('🟢 GET : doit lister les ouvrages de la bibliothèque', async () => {
    vi.mocked(LibraryBookModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'book_1', title: 'Le Livre des Sentiers' }])
      })
    } as any);

    const req = new NextRequest('http://localhost:3000/api/bibliotek?writingType=essai');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('Le Livre des Sentiers');
  });

  it('🔴 POST : doit rejeter (401) si l’Oiseau n’est pas connecté', async () => {
    delete (global as any).__mockUser;

    const req = new NextRequest('http://localhost:3000/api/bibliotek', {
      method: 'POST',
      body: JSON.stringify({ title: 'Mon Roman', fileUrl: 'cdn://roman.epub' })
    });

    const res = await POST(req, {} as any);
    expect(res.status).toBe(401);
  });

  it('🟢 POST : doit sédimenter l’ouvrage, forger le sceau et retourner (201)', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/bibliotek', {
      method: 'POST',
      body: JSON.stringify({ 
        title: 'Essai sur la Silice', 
        fileUrl: 'https://cdn.ilot/books/essai.epub',
        writingType: 'essai',
        style: 'philosophie'
      })
    });

    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('book_new_123');
    expect(json.digitalSignature).toHaveLength(64);
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-public');
  });
});