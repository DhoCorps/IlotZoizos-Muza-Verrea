import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/kontakt/profiles/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { slugify } from '@/lib/slugify';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((str) => str ? str.toLowerCase().replace(/\s+/g, '-') : 'profil-oiseau')
}));

const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  KontaktProfileModel: {
    find: (...args: any[]) => mockFind(...args),
    findOne: (...args: any[]) => mockFindOne(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

describe('API Kontakt - Collection de Profils (GET / POST /api/kontakt-profiles)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit retourner la liste des profils Kontakt avec un statut 200', async () => {
    const mockProfiles = [
      { uid: 'kontakt_1', professionalTitle: 'Architecte Logiciel', userUid: 'bird_1' }
    ];

    const leanMock = vi.fn().mockResolvedValue(mockProfiles);
    const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
    mockFind.mockReturnValue({ sort: sortMock });

    const req = new Request('http://localhost:3000/api/kontakt-profiles');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mockProfiles);
    expect(mockFind).toHaveBeenCalledWith({});
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/kontakt-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalTitle: 'Développeur' })
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('❌ POST : doit rejeter si un profil existe déjà pour cet oiseau (409)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'bird_1' }
    } as any);

    // Simulation qu'un profil existe déjà en base pour cet utilisateur
    mockFindOne.mockResolvedValueOnce({ uid: 'kontakt_1', userUid: 'bird_1' });

    const req = new Request('http://localhost:3000/api/kontakt-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalTitle: 'Développeur' })
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('Un profil Kontakt existe déjà');
  });

  it('✅ POST : doit créer un profil initial si l’oiseau n’en a pas (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'bird_1' }
    } as any);

    // 1. Aucun profil existant pour l'utilisateur
    mockFindOne.mockResolvedValueOnce(null);
    // 2. Aucun doublon de slug en base
    mockFindOne.mockResolvedValueOnce(null);

    const createdMock = {
      uid: 'kontakt_uuid-test',
      userUid: 'bird_1',
      professionalTitle: 'Architecte Silicieux',
      slug: 'architecte-silicieux'
    };

    mockCreate.mockResolvedValueOnce(createdMock);

    const req = new Request('http://localhost:3000/api/kontakt-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalTitle: 'Architecte Silicieux' })
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(createdMock);
    expect(slugify).toHaveBeenCalledWith('Architecte Silicieux');
    expect(mockCreate).toHaveBeenCalled();
  });
});