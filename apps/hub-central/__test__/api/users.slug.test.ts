import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';

// --- MOCKS ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

describe('User Slug API [GET]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner le profil intime si c est soi-même en appliquant le slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'mon-super-oiseau' },
    } as any);

    const mockOiseau = {
      uid: 'mon-super-oiseau',
      slug: 'mon-super-oiseau',
      pseudo: 'Oiseau Libre',
      email: 'libre@ilot.local',
      sanctuaireVerrouille: false,
      isGhostMode: false,
    };

    vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce(mockOiseau),
    } as any);

    const req = new Request('http://localhost/api/users/Mon Super Oiseau!');
    const res = await GET(req, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.email).toBe('libre@ilot.local');
    expect(OiseauModel.findOne).toHaveBeenCalledWith({
      $or: [{ slug: 'mon-super-oiseau' }, { uid: 'mon-super-oiseau' }],
    });
  });

  it('devrait retourner 404 si l oiseau est introuvable', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'autre-oiseau' },
    } as any);

    vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce(null),
    } as any);

    const req = new Request('http://localhost/api/users/Inconnu');
    const res = await GET(req, { params: Promise.resolve({ slug: 'Inconnu' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.message).toContain("L'onde s'est dissipée");
  });
});