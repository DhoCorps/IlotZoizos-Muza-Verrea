import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/partita/route';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { getCachedPartitas } from '@/lib/cache/partita.cache';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DU CACHE NEXT.JS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
  revalidateTag: vi.fn(),
}));

// MOCK DES GARDES D'AURA
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

declare global {
  var __mockUser: any;
}

describe('API Partita - Collection (GET / POST) avec Sceau SHA-256', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de PartitaOrchestrator
    vi.spyOn(PartitaOrchestrator.prototype, 'fosterPartita').mockResolvedValue({
      uid: 'part_new',
      title: 'Opus 1',
    } as any);
  });

  it('✅ GET : doit lister les partitions', async () => {
    delete (global as any).__mockUser;

    // Pilotage explicite du retour du cache pour ce test
    vi.mocked(getCachedPartitas).mockResolvedValueOnce([{ uid: 'part_1', title: 'Sonate' }] as any);

    const req = new Request('http://localhost:3000/api/partita?instrument=piano');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Sonate');
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas identifié (401)', async () => {
    delete (global as any).__mockUser;
    const req = new Request('http://localhost/api/partita', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('❌ POST : doit rejeter si titre ou contenu manquant (400)', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };
    const req = new Request('http://localhost/api/partita', {
      method: 'POST', body: JSON.stringify({ title: 'Juste un titre' })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('✅ POST : doit fonder la partition, forger le Sceau SHA-256 avec succès (201)', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new Request('http://localhost/api/partita', {
      method: 'POST', body: JSON.stringify({ title: 'Opus 1', content: 'C D E' })
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.uid).toBe('part_new');
    expect(data.digitalSignature).toBeDefined();
    expect(typeof data.digitalSignature).toBe('string');
    expect(data.digitalSignature.length).toBe(64); // Validation de l'empreinte SHA-256
    expect(revalidateTag).toHaveBeenCalledWith('partitas');
  });
});