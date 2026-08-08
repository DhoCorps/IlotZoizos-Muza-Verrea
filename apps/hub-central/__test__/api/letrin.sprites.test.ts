import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/letrin/sprites/route';
import { LetterSpriteModel } from '@ilot/infrastructure';
import { LetrinSpriteOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context);
  },
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const mockLean = vi.fn();
const mockSort = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  LetterSpriteModel: {
    find: vi.fn((...args) => mockFind(...args)),
    findOne: vi.fn(() => ({ lean: vi.fn().mockResolvedValue(null) })),
    create: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  LetrinSpriteOrchestrator: vi.fn().mockImplementation(() => ({
    publishFontSprite: vi.fn().mockResolvedValue(true),
  })),
}));

declare global {
  var __mockUser: any;
}

describe('API Letr\'In Sprites - Gestion des polices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des polices avec succès (200)', async () => {
    mockLean.mockResolvedValueOnce([{ uid: 'font_1', name: 'CyberFont' }]);

    const req = new Request('http://localhost/api/letrin/sprites');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].uid).toBe('font_1');
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation)
  // =========================================================================
  it('🔴 doit rejeter l’envoi si l’oiseau n’est pas connecté (401)', async () => {
    global.__mockUser = undefined;

    const req = new Request('http://localhost/api/letrin/sprites', {
      method: 'POST',
      body: JSON.stringify({ name: 'CyberFont' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🟢 doit créer une nouvelle police avec succès et invalider le cache (201)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };

    const mockCreatedFont = {
      uid: 'font_new',
      name: 'CyberFont',
      slug: 'cyberfont',
      authorUid: 'bird_1'
    };

    vi.mocked(LetterSpriteModel.create).mockResolvedValueOnce(mockCreatedFont as any);

    const req = new Request('http://localhost/api/letrin/sprites', {
      method: 'POST',
      body: JSON.stringify({ name: 'CyberFont', gridSize: { width: 16, height: 16 } })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('font_new');
    expect(revalidateTag).toHaveBeenCalledWith('fonts');
    expect(revalidateTag).toHaveBeenCalledWith('letrin');
  });
});