import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/partita/route';
import { getServerSession } from 'next-auth/next';
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

const mockLean = vi.fn();
const mockLimit = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockSort = vi.fn().mockImplementation(() => ({ limit: mockLimit }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  PartitaModel: { find: (...args: any[]) => mockFind(...args) }
}));

const mockFosterPartita = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  PartitaOrchestrator: vi.fn().mockImplementation(() => ({
    fosterPartita: mockFosterPartita
  }))
}));

describe('API Partita - Collection (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('✅ GET : doit lister les partitions', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    mockLean.mockResolvedValueOnce([{ uid: 'part_1', title: 'Sonate' }]);

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
    mockFosterPartita.mockResolvedValueOnce({ uid: 'part_new', title: 'Opus 1' });

    const req = new Request('http://localhost/api/partita', {
      method: 'POST', body: JSON.stringify({ title: 'Opus 1', content: 'C D E' })
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.uid).toBe('part_new');
    expect(mockFosterPartita).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('partitas');
  });
});