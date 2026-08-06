import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/kontakt/profiles/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFind = vi.fn();
const mockFindOne = vi.fn().mockResolvedValue(null);
const mockFindOneAndUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  KontaktProfileModel: {
    find: (...args: any[]) => ({
      sort: () => ({
        lean: () => mockFind(...args)
      })
    }),
    findOne: (...args: any[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

vi.mock('../../../../lib/slugify', () => ({
  slugify: (str: string) => str.toLowerCase().replace(/\s+/g, '-')
}));

describe('API Kontakt - Profiles Principal (GET / POST /api/kontakt/profiles)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit lister les profils Kontakt', async () => {
    mockFind.mockResolvedValueOnce([{ uid: 'kontakt_1', professionalTitle: 'Développeur Elfe' }]);

    const req = new Request('http://localhost:3000/api/kontakt/profiles');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/kontakt/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalTitle: 'Architecte' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('✅ POST : doit créer un profil Kontakt s’il n’existe pas encore (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_kontakt_1' }
    } as any);

    mockFindOne.mockResolvedValueOnce(null); // Pas de profil existant
    mockCreate.mockResolvedValueOnce({
      uid: 'kontakt_new',
      professionalTitle: 'Architecte',
      slug: 'architecte'
    });

    const req = new Request('http://localhost:3000/api/kontakt/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalTitle: 'Architecte' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.slug).toBe('architecte');
    expect(mockCreate).toHaveBeenCalled();
  });
});