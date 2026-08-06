import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../../app/api/kontakt/profiles/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockDeleteOne = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  KontaktProfileModel: {
    findOne: (...args: any[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    deleteOne: (...args: any[]) => mockDeleteOne(...args)
  }
}));

describe('API Kontakt - Profile par Slug (GET / PUT / DELETE /api/kontakt/profiles/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit retourner le profil Kontakt si trouvé', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    mockFindOne.mockImplementationOnce(() => ({
      lean: () => Promise.resolve({
        uid: 'kontakt_1',
        professionalTitle: 'Architecte Logiciel',
        userUid: 'bird_1'
      })
    }));

    const req = new Request('http://localhost:3000/api/kontakt/profiles/architecte-logiciel');
    const res = await GET(req, { params: Promise.resolve({ slug: 'architecte-logiciel' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uid).toBe('kontakt_1');
  });

  it('❌ PUT : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/kontakt/profiles/architecte-logiciel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: 'Nouvelle bio' })
    });
    const res = await PUT(req, { params: Promise.resolve({ slug: 'architecte-logiciel' }) });

    expect(res.status).toBe(401);
  });

  it('✅ PUT : doit mettre à jour le profil si l’auteur est le propriétaire (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'bird_1', capabilities: [] }
    } as any);

    mockFindOne.mockResolvedValueOnce({
      uid: 'kontakt_1',
      userUid: 'bird_1'
    });

    mockFindOneAndUpdate.mockImplementationOnce(() => ({
      lean: () => Promise.resolve({
        uid: 'kontakt_1',
        professionalTitle: 'Architecte Modifié',
        userUid: 'bird_1'
      })
    }));

    const req = new Request('http://localhost:3000/api/kontakt/profiles/architecte-logiciel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: 'Nouvelle bio' })
    });
    const res = await PUT(req, { params: Promise.resolve({ slug: 'architecte-logiciel' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('✅ DELETE : doit supprimer le profil si l’auteur est le propriétaire (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'bird_1', capabilities: [] }
    } as any);

    mockFindOne.mockResolvedValueOnce({
      uid: 'kontakt_1',
      userUid: 'bird_1'
    });

    const req = new Request('http://localhost:3000/api/kontakt/profiles/architecte-logiciel', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'architecte-logiciel' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteOne).toHaveBeenCalled();
  });
});