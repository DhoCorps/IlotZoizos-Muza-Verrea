import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/messages/route';
import { MessageModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES GARDES D'API ET DU CACHE
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// Simulation chaînée des méthodes Mongoose (.find().sort().limit().lean())
const mockLean = vi.fn();
const mockLimit = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockSort = vi.fn().mockImplementation(() => ({ limit: mockLimit }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  MessageModel: {
    find: vi.fn((...args) => mockFind(...args)),
    create: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  attachmentRegistry: {
    resolve: vi.fn().mockResolvedValue({ sourceType: 'note', entitySlug: 'note-1', url: 'https://ilot.com/note-1' }),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Messages - Messagerie Universelle par Slugs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // =========================================================================
  // 🔍 TESTS GET (Historique)
  // =========================================================================
  it('🟢 doit récupérer l’historique par conversationSlug (GET)', async () => {
    global.__mockUser = undefined;
    mockLean.mockResolvedValueOnce([{ slug: 'msg_1', content: 'Salut la canopée' }]);

    const req = new Request('http://localhost/api/messages?conversationSlug=salon-1-slug');
    const res = await GET(req as any, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(MessageModel.find).toHaveBeenCalledWith({ conversationSlug: 'salon-1-slug' });
  });

  it('🔴 doit rejeter la récupération GET si le conversationSlug est manquant (400)', async () => {
    const req = new Request('http://localhost/api/messages');
    const res = await GET(req as any, {});
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Slug de salon manquant");
  });

  // =========================================================================
  // 🚀 TESTS POST (Propagation)
  // =========================================================================
  it('🔴 doit rejeter l’envoi si l’oiseau n’est pas connecté (401)', async () => {
    global.__mockUser = undefined; // Non connecté

    const req = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationSlug: 'salon-1-slug', content: 'Test', rawAttachments: [] })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter un message entièrement vide (400)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };

    const req = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationSlug: 'salon-1-slug', content: '   ', rawAttachments: [] })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(400);
  });

  it('🟢 doit créer un message par slug avec succès (201)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };

    const mockCreated = {
      slug: 'msg_new',
      conversationSlug: 'salon-1-slug',
      content: 'Le chant s\'élève',
      senderSlug: 'oiseau-fer'
    };

    vi.mocked(MessageModel.create).mockResolvedValueOnce(mockCreated as any);

    const req = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationSlug: 'salon-1-slug', content: 'Le chant s\'élève', rawAttachments: [] })
    });

    const res = await POST(req as any, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message.conversationSlug).toBe('salon-1-slug');
    expect(revalidateTag).toHaveBeenCalledWith('conversation-salon-1-slug');
  });
});