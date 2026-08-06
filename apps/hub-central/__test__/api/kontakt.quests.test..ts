import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/kontakt/quests/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFind = vi.fn();
const mockFindOne = vi.fn().mockResolvedValue(null);
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  JobQuestModel: {
    find: (...args: any[]) => ({
      sort: () => ({
        lean: () => mockFind(...args)
      })
    }),
    findOne: (...args: any[]) => mockFindOne(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

vi.mock('../../../../lib/slugify', () => ({
  slugify: (str: string) => str.toLowerCase().replace(/\s+/g, '-')
}));

describe('API Kontakt - Quests Principal (GET / POST /api/kontakt/quests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit lister les quêtes actives', async () => {
    mockFind.mockResolvedValueOnce([{ uid: 'quest_1', title: 'Quête de Sève' }]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/kontakt/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouvelle Quête' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('✅ POST : doit créer une quête avec slug unique (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_quest_giver' }
    } as any);

    mockCreate.mockResolvedValueOnce({
      uid: 'quest_new',
      title: 'Nouvelle Quête',
      slug: 'nouvelle-quete'
    });

    const req = new Request('http://localhost:3000/api/kontakt/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouvelle Quête' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.slug).toBe('nouvelle-quete');
    expect(mockCreate).toHaveBeenCalled();
  });
});