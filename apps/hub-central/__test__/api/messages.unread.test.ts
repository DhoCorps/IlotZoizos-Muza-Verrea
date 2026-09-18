import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/messages/unread/route';
import { getCachedUnreadCount } from '@/lib/cache/messages.cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/cache/messages.cache', () => ({
  getCachedUnreadCount: vi.fn(),
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('API Messages Unread - Comptage des murmures non lus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🟢 doit renvoyer le nombre de messages non lus avec succès (200)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'bird-1', capabilities: [] };
    vi.mocked(getCachedUnreadCount).mockResolvedValueOnce(5);

    const req = new NextRequest('http://localhost/api/messages/unread');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.unreadCount).toBe(5);
    expect(getCachedUnreadCount).toHaveBeenCalledWith('bird-1');
  });

  it('🔴 doit rejeter avec une erreur 401 si l\'oiseau n\'est pas authentifié par le garde', async () => {
    delete global.__mockUser; // Pas d'utilisateur connecté

    const req = new NextRequest('http://localhost/api/messages/unread');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('Accès non autorisé');
  });
});