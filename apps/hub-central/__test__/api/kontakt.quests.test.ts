import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  JobQuestModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        // 🪡 Ajout du slug
        { uid: 'quest-001', title: 'Recherche Paladin Fullstack', slug: 'recherche-paladin-fullstack', status: 'ACTIVE' }
      ])
    }),
    findOne: vi.fn().mockResolvedValue(null), // 🪡 Unicité du slug
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock_id' }))
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { uid: 'bird-alpha', name: 'Albatros', capabilities: ['*'] }
  })
}));

import { GET, POST } from '../../app/api/kontakt/quests/route';

describe('API Kontakt Quests (/api/kontakt/quests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser toutes les quêtes actives (GET)', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].title).toBe('Recherche Paladin Fullstack');
  });

  it('🟢 doit publier une nouvelle quête de recrutement (POST)', async () => {
    const req = new Request('http://localhost/api/kontakt/quests', {
      method: 'POST',
      body: JSON.stringify({
        projectUid: 'project-01',
        title: 'Chasse aux Bugs Cyberpunk',
        description: 'Éliminer les anomalies de la matrice'
      })
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Chasse aux Bugs Cyberpunk');
    expect(data.data.slug).toBe('chasse-aux-bugs-cyberpunk'); // 🪡
  });
});