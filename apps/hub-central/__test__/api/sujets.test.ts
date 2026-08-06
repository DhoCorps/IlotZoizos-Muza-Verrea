import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/sujets/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

const mockLean = vi.fn();
const mockLimit = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockSort = vi.fn().mockImplementation(() => ({ limit: mockLimit }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  SujetModel: { find: (...args: any[]) => mockFind(...args) }
}));

const mockFosterSujet = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  SujetOrchestrator: vi.fn().mockImplementation(() => ({
    fosterSujet: mockFosterSujet
  }))
}));

describe('API Sujets - Bibliothèque (GET / POST)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('🟢 GET : doit lister les monologues publics (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    mockLean.mockResolvedValueOnce([{ uid: 'sujet_1', title: 'Lumière' }]);

    const req = new Request('http://localhost/api/sujets?category=philosophie');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data[0].title).toBe('Lumière');
  });

  it('🔴 POST : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('🔴 POST : doit rejeter si titre ou contenu manquant (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    const req = new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ title: 'Juste un titre' }) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('🟢 POST : doit fonder le noeud de pensée avec succès (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);
    mockFosterSujet.mockResolvedValueOnce({ uid: 'sujet_new', title: 'Nouvelle Aube' });

    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ title: 'Nouvelle Aube', content: 'Le soleil se lève...' }) 
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.title).toBe('Nouvelle Aube');
  });
});