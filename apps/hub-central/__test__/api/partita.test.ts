import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/partita/route';
import { getServerSession } from 'next-auth/next';
import { PartitaModel } from '@ilot/infrastructure';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DU CACHE NEXT.JS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Renvoie la fonction callback sans l'exécuter immédiatement
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// 🛡️ MOCK MONGOOSE PLEINEMENT CHAÎNABLE
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  PartitaModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }
}));

describe('API Partita - Collection (GET / POST)', () => {
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
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    // On surcharge le mock pour retourner notre tableau de partitions
    vi.mocked(PartitaModel.find).mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ uid: 'part_1', title: 'Sonate' }]),
        }),
      }),
    } as any);

    const req = new Request('http://localhost:3000/api/partita?instrument=piano');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data[0].title).toBe('Sonate');
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas identifié (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/partita', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('❌ POST : doit rejeter si titre ou contenu manquant (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);
    const req = new Request('http://localhost/api/partita', {
      method: 'POST', body: JSON.stringify({ title: 'Juste un titre' })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('✅ POST : doit fonder la partition avec succès (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);

    const req = new Request('http://localhost/api/partita', {
      method: 'POST', body: JSON.stringify({ title: 'Opus 1', content: 'C D E' })
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.uid).toBe('part_new');
    expect(revalidateTag).toHaveBeenCalledWith('partitas');
  });
});