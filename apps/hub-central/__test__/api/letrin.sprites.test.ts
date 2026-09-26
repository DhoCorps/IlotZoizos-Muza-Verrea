import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/letrin/sprites/route';
import { LetrinFontSpriteModel } from '@ilot/infrastructure';
import { getCachedFonts } from '@/lib/cache/letrin.cache';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => handler,
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: vi.fn((err) => new Response(JSON.stringify({ error: err.message }), { status: 500 }))
}));

vi.mock('@ilot/infrastructure', () => ({
  LetrinFontSpriteModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/lib/cache/letrin.cache', () => ({
  getCachedFonts: vi.fn(),
}));

vi.mock('@ilot/shared-core', () => ({
  LetrinSpriteOrchestrator: class {
    publishFontSprite = vi.fn().mockResolvedValue(true);
  },
}));

describe('API Letr\'In Sprites (GET / POST) avec Filtrage et Sceau SHA-256', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('GET - doit recenser les polices et filtrer correctement par catégorie et tags', async () => {
    const mockFonts = [
      { uid: 'f_1', name: 'Humane Font', category: 'HUMANE', tags: ['calligraphie'], frequencyHz: 432 },
      { uid: 'f_2', name: 'Gothique Font', category: 'GOTHIQUE', tags: ['glitch'], frequencyHz: 396 },
    ];
    
    vi.mocked(getCachedFonts).mockResolvedValue(mockFonts as any);

    const reqCategory = new NextRequest('http://localhost/api/letrin/sprites?category=GOTHIQUE');
    const resCategory = await GET(reqCategory, { params: Promise.resolve({}) } as any);
    const jsonCategory = await resCategory.json();

    expect(resCategory.status).toBe(200);
    expect(jsonCategory).toHaveLength(1);
    expect(jsonCategory[0].name).toBe('Gothique Font');

    const reqTag = new NextRequest('http://localhost/api/letrin/sprites?tag=calligraphie');
    const resTag = await GET(reqTag, { params: Promise.resolve({}) } as any);
    const jsonTag = await resTag.json();

    expect(jsonTag).toHaveLength(1);
    expect(jsonTag[0].category).toBe('HUMANE');
  });

  it('POST - doit créer une police avec taxonomie, fréquence Hz et forger le Sceau SHA-256', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    vi.mocked(LetrinFontSpriteModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof LetrinFontSpriteModel.findOne>);

    vi.mocked(LetrinFontSpriteModel.create).mockImplementation((doc: unknown) => Promise.resolve({
      ...(doc as Record<string, unknown>),
      _id: 'mongo_id_abc',
    }) as unknown as ReturnType<typeof LetrinFontSpriteModel.create>);

    const reqData = {
      name: 'Police Alchimique',
      category: 'MECANE',
      tags: ['magie'],
      frequencyHz: 528,
      gridSize: { width: 16, height: 16 },
      glyphs: []
    };

    const req = new NextRequest('http://localhost/api/letrin/sprites', {
      method: 'POST',
      body: JSON.stringify(reqData)
    });

    const res = await POST(req, { params: Promise.resolve({}) } as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.category).toBe('MECANE');
    expect(json.digitalSignature).toBeDefined();
    expect(json.digitalSignature.length).toBe(64); 
    expect(revalidateTag).toHaveBeenCalledWith('fonts');
  });

  it('POST - doit rejeter la création si les champs stricts de validation Zod échouent', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    const invalidReqData = { category: 'HUMANE', frequencyHz: 432 }; 
    const req = new NextRequest('http://localhost/api/letrin/sprites', {
      method: 'POST',
      body: JSON.stringify(invalidReqData)
    });

    const res = await POST(req, { params: Promise.resolve({}) } as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données de police de sprites invalides.");
  });
});