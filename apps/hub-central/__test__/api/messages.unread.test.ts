import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/messages/unread/route';
import { MessageModel } from '@ilot/infrastructure';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES GARDES D'API ET DU CACHE
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  MessageModel: {
    countDocuments: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Messages Unread - Comptage des murmures non lus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🔴 doit rejeter l’accès (401) si l’oiseau n’est pas connecté', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/messages/unread');
    const res = await GET(req as any, {});

    expect(res.status).toBe(401);
  });

  it('🟢 doit renvoyer le nombre de messages non lus (200) avec succès', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };
    vi.mocked(MessageModel.countDocuments).mockResolvedValueOnce(5);

    const req = new Request('http://localhost/api/messages/unread');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.unreadCount).toBe(5);
    expect(MessageModel.countDocuments).toHaveBeenCalledWith({
      senderSlug: { $ne: 'oiseau-fer' },
      "readBy.userSlug": { $ne: 'oiseau-fer' }
    });
  });
});