import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/partita/route';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { getCachedPartitas } from '@/lib/cache/partita.cache';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DU CACHE NEXT.JS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn(),
}));

// MOCK DES GARDES D'AURA
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

// 🎯 Mock explicite de getCachedPartitas
vi.mock('@/lib/cache/partita.cache', () => ({
  getCachedPartitas: vi.fn(),
}));

// 🛡️ MOCK MONGOOSE
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  PartitaModel: {
    find: vi.fn(),
  }
}));

// 🛡️ Déclaration globale unifiée pour éviter les conflits de types
declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('API Partita - Collection (GET / POST) avec Sceau SHA-256', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de PartitaOrchestrator
    vi.spyOn(PartitaOrchestrator.prototype, 'fosterPartita').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: {
        uid: 'part_new',
        title: 'Opus 1',
      } as unknown as import('@ilot/types').IPartita,
      neo4j: {} as unknown as import('neo4j-driver').QueryResult
    });
  });

  it('✅ GET : doit lister les partitions', async () => {
    delete global.__mockUser;

    vi.mocked(getCachedPartitas).mockResolvedValueOnce([{ uid: 'part_1', title: 'Sonate' }] as unknown as Awaited<ReturnType<typeof getCachedPartitas>>);

    const req = new NextRequest('http://localhost:3000/api/partita?instrument=piano');
    const res = await GET(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Sonate');
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas identifié (401)', async () => {
    delete global.__mockUser;
    const req = new NextRequest('http://localhost/api/partita', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('❌ POST : doit rejeter si titre ou contenu manquant (400)', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };
    const req = new NextRequest('http://localhost/api/partita', {
      method: 'POST', body: JSON.stringify({ title: 'Juste un titre' })
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it('✅ POST : doit fonder la partition, forger le Sceau SHA-256 avec succès (201)', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/partita', {
      method: 'POST', body: JSON.stringify({ title: 'Opus 1', content: 'C D E' })
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.uid).toBe('part_new');
    expect(data.digitalSignature).toBeDefined();
    expect(typeof data.digitalSignature).toBe('string');
    expect(data.digitalSignature.length).toBe(64);
    expect(revalidateTag).toHaveBeenCalledWith('partitas');
  });
});