import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/letrin/sprites/route';
import { LetterSpriteModel } from '@ilot/infrastructure';
import { getCachedFonts } from '@/lib/cache/letrin.cache';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => handler,
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  LetterSpriteModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

// 🎯 Mock explicite de la fonction de cache
vi.mock('@/lib/cache/letrin.cache', () => ({
  getCachedFonts: vi.fn(),
}));

vi.mock('@ilot/shared-core', () => ({
  LetrinSpriteOrchestrator: class {
    publishFontSprite = vi.fn().mockResolvedValue(true);
  },
}));

describe('API Letr\'In Sprites (GET / POST) avec Sceau SHA-256', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('GET - doit recenser les polices mises en cache', async () => {
    // 🎯 Forçage de la résolution du mock pour ce test précis
    vi.mocked(getCachedFonts).mockResolvedValueOnce([{ uid: 'font_1', name: 'Test Font' }] as unknown as Awaited<ReturnType<typeof getCachedFonts>>);

    const req = new NextRequest('http://localhost/api/letrin/sprites');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([{ uid: 'font_1', name: 'Test Font' }]);
  });

  it('POST - doit créer une police, forger le Sceau SHA-256 d\'antériorité et sédimenter', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    vi.mocked(LetterSpriteModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof LetterSpriteModel.findOne>);

    vi.mocked(LetterSpriteModel.create).mockImplementation((doc: unknown) => Promise.resolve({
      ...(doc as Record<string, unknown>),
      _id: 'mongo_id_abc',
    }) as unknown as ReturnType<typeof LetterSpriteModel.create>);

    const reqData = {
      name: 'Police Canopée',
      gridSize: { width: 16, height: 16 },
      glyphs: [{ char: 'A', pixels: [] }]
    };

    const req = new NextRequest('http://localhost/api/letrin/sprites', {
      method: 'POST',
      body: JSON.stringify(reqData)
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Police Canopée');
    expect(json.digitalSignature).toBeDefined();
    expect(typeof json.digitalSignature).toBe('string');
    expect(json.digitalSignature.length).toBe(64); // Vérification de l'empreinte SHA-256
    expect(revalidateTag).toHaveBeenCalledWith('fonts');
    expect(revalidateTag).toHaveBeenCalledWith('letrin');
  });
});