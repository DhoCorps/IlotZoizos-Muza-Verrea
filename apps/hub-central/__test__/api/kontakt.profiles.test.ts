import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  KontaktProfileModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        // 🪡 Ajout du slug
        { uid: 'kontakt-001', userUid: 'bird-alpha', professionalTitle: 'Mage Fullstack', slug: 'mage-fullstack', alignment: 'CHAOTIC_GOOD' }
      ])
    }),
    findOne: vi.fn().mockImplementation((query) => {
      if (query.userUid === 'bird-alpha' || query.slug === 'mage-fullstack') {
        return Promise.resolve({ uid: 'kontakt-001', userUid: 'bird-alpha', professionalTitle: 'Mage Fullstack', slug: 'mage-fullstack' });
      }
      return Promise.resolve(null);
    }),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock_id' })),
    findOneAndUpdate: vi.fn().mockImplementation((query, update) => {
      return Promise.resolve({ userUid: query.userUid, ...update.$set });
    })
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { uid: 'bird-alpha', name: 'Albatros', capabilities: ['*'] }
  })
}));

import { GET, POST } from '../../app/api/kontakt/profiles/route';

describe('API Kontakt Profiles (/api/kontakt/profiles)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser tous les profils Kontakt (GET)', async () => {
    const req = new Request('http://localhost/api/kontakt/profiles');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].professionalTitle).toBe('Mage Fullstack');
  });

  it('🟢 doit sédimenter un nouveau profil Kontakt (POST)', async () => {
    const req = new Request('http://localhost/api/kontakt/profiles', {
      method: 'POST',
      body: JSON.stringify({
        professionalTitle: 'Architecte Réplicant',
        archetypeClass: 'Chasseur de Bugs',
        alignment: 'REPLICANT_BR'
      })
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.professionalTitle).toBe('Architecte Réplicant');
    expect(data.data.slug).toBe('architecte-replicant'); // 🪡 Vérification du slug
  });
});