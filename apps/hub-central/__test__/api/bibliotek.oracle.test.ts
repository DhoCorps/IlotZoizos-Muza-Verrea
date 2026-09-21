import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/bibliotek/oracle/route';
import { LibraryBookModel } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withOptionalAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      // @ts-ignore
      return await handler(req, context, global.__mockUser);
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
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Bibliotek - Oracle du Sceau (/api/bibliotek/oracle)', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 GET : doit rejeter (400) si aucun sceau/hash n\'est fourni en paramètre', async () => {
    const req = new NextRequest('http://localhost:3000/api/bibliotek/oracle');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('sceau cryptographique');
  });

  it('🔴 GET : doit retourner (404) si le sceau SHA-256 ne correspond à aucun ouvrage', async () => {
    // 🛠️ CORRECTION : Simulation d'un query builder Mongoose dont lean() résout à null
    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(null)
    } as unknown as ReturnType<typeof LibraryBookModel.findOne>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/oracle?signature=invalid_hash_123');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.verified).toBe(false);
    expect(json.error).toContain('Antériorité non certifiée');
  });

  it('🟢 GET : doit authentifier et retourner l\'ouvrage si le sceau SHA-256 est valide', async () => {
    const mockBook = {
      uid: 'book_abc',
      title: 'Le Chant de la Silice',
      authorSlug: 'Oiseau Solitaire',
      writingType: 'essai',
      style: 'philosophie',
      digitalSignature: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestampedAt: new Date(),
      createdAt: new Date(),
    };

    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(mockBook)
    } as unknown as ReturnType<typeof LibraryBookModel.findOne>);

    const req = new NextRequest(`http://localhost:3000/api/bibliotek/oracle?signature=${mockBook.digitalSignature}`);
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.verified).toBe(true);
    expect(json.data.title).toBe('Le Chant de la Silice');
    expect(json.data.digitalSignature).toBe(mockBook.digitalSignature);
  });
});