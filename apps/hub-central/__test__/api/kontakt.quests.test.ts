import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/kontakt/quests/route';
import { JobQuestModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié. Publication refusée." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  JobQuestModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    create: vi.fn(),
  },
}));

describe('API Kontakt Job Quests - Gestion des quêtes de recrutement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des quêtes actives avec succès (200)', async () => {
    vi.mocked(JobQuestModel.find).mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'quest_1', title: 'Quête Fullstack' }]),
      }),
    } as unknown as ReturnType<typeof JobQuestModel.find>);

    const req = new NextRequest('http://localhost/api/kontakt/quests');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].uid).toBe('quest_1');
    expect(JobQuestModel.find).toHaveBeenCalledWith({ status: 'ACTIVE' });
  });

  // =========================================================================
  // 🚀 TESTS POST (Publication)
  // =========================================================================
  it('🔴 doit rejeter la publication (401) si l\'oiseau n\'est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/quests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nouvelle Quête', description: 'Test desc' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🟢 doit publier une nouvelle quête avec succès (201) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockCreatedQuest = {
      uid: 'quest_new',
      title: 'Développeur Matrix',
      slug: 'developpeur-matrix',
      status: 'ACTIVE'
    };

    vi.mocked(JobQuestModel.create).mockResolvedValueOnce(mockCreatedQuest as unknown as Awaited<ReturnType<typeof JobQuestModel.create>>);

    const req = new NextRequest('http://localhost/api/kontakt/quests', {
      method: 'POST',
      body: JSON.stringify({ title: 'Développeur Matrix', description: 'Cherche mage Neo4j' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('quest_new');
    expect(json.data.slug).toBe('developpeur-matrix');
    expect(revalidateTag).toHaveBeenCalledWith('job-quests');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-quests');
  });
});