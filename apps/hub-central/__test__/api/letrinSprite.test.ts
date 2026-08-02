import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  LetterSpriteModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { uid: 'font-001', name: 'Abyss Pixel', slug: 'abyss-pixel', status: 'RELEASED', glyphs: [] }
      ])
    }),
    findOne: vi.fn().mockImplementation((query) => {
      const target = query.uid || query.slug;
      if (target === 'font-001' || target === 'abyss-pixel') {
        return Promise.resolve({ uid: 'font-001', name: 'Abyss Pixel', slug: 'abyss-pixel', status: 'RELEASED', glyphs: [] });
      }
      return Promise.resolve(null);
    }),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock_id' })),
    findOneAndUpdate: vi.fn().mockImplementation((query, update) => {
      return Promise.resolve({ uid: 'font-001', ...update.$set });
    }),
    findOneAndDelete: vi.fn().mockImplementation((query) => {
      const target = query.uid || query.slug;
      if (target === 'font-001' || target === 'abyss-pixel') return Promise.resolve({ uid: 'font-001' });
      return Promise.resolve(null);
    })
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { uid: 'bird-alpha', name: 'Albatros', capabilities: ['*'] }
  })
}));

vi.mock('@ilot/shared-core', () => ({
  LetrinSpriteOrchestrator: class {
    async publishFontSprite() {
      return { success: true };
    }
  }
}));

import { GET as getSprites, POST as postSprite } from '../../app/api/letrin/sprites/route';
import { GET as getSpriteBySlug, PUT as putSpriteBySlug, DELETE as deleteSpriteBySlug } from '../../app/api/letrin/sprites/[slug]/route';

describe('API Letr\'In Sprites (/api/letrin/sprites)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser toutes les polices de sprites (GET)', async () => {
    const res = await getSprites();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].slug).toBe('abyss-pixel');
  });

  it('🟢 doit sédimenter une nouvelle police de sprites (POST)', async () => {
    const req = new Request('http://localhost/api/letrin/sprites', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Font Test',
        gridSize: { width: 16, height: 16 },
        glyphs: []
      })
    });
    const res = await postSprite(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Font Test');
    expect(data.data.slug).toBe('font-test');
  });
});

describe('API Letr\'In Sprite By Slug (/api/letrin/sprites/[slug])', () => {
  // 🪡 Correction : Objet synchrone conforme à la route [slug]
  const mockParams = { params: { slug: 'abyss-pixel' } };

  it('🟢 doit récupérer une police spécifique par son slug (GET)', async () => {
    const req = new Request('http://localhost/api/letrin/sprites/abyss-pixel');
    const res = await getSpriteBySlug(req, mockParams);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.slug).toBe('abyss-pixel');
  });

  it('🔴 doit renvoyer 404 si la police n\'existe pas (GET)', async () => {
    const req = new Request('http://localhost/api/letrin/sprites/unknown');
    const res = await getSpriteBySlug(req, { params: { slug: 'unknown' } });
    expect(res.status).toBe(404);
  });

  it('🟢 doit mettre à jour une police existante (PUT)', async () => {
    const req = new Request('http://localhost/api/letrin/sprites/abyss-pixel', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Font Name' })
    });
    const res = await putSpriteBySlug(req, mockParams);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Updated Font Name');
  });

  it('🟢 doit dissoudre/supprimer une police (DELETE)', async () => {
    const req = new Request('http://localhost/api/letrin/sprites/abyss-pixel', {
      method: 'DELETE'
    });
    const res = await deleteSpriteBySlug(req, mockParams);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});