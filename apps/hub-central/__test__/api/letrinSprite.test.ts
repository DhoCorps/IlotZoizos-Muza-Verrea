import { describe, it, expect, vi, beforeEach } from 'vitest';
// 🪡 On importe les deux fichiers routes avec des alias !
import { GET as getCollection, POST as postCollection } from '../../app/api/letrin/sprites/route';
import { GET as getBySlug, PUT as putBySlug, DELETE as deleteBySlug } from '../../app/api/letrin/sprites/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockLean = vi.fn();
const mockSort = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));
const mockCreate = vi.fn();
const mockFindOneLean = vi.fn();
const mockFindOneAndUpdateLean = vi.fn();
const mockFindOneAndDelete = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  LetterSpriteModel: {
    find: (...args: any[]) => mockFind(...args),
    create: (...args: any[]) => mockCreate(...args),
    findOne: vi.fn().mockImplementation(() => ({ lean: mockFindOneLean })),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({ lean: mockFindOneAndUpdateLean })),
    findOneAndDelete: (...args: any[]) => mockFindOneAndDelete(...args)
  }
}));

vi.mock('@ilot/shared-core', () => ({
  LetrinSpriteOrchestrator: vi.fn().mockImplementation(() => ({
    publishFontSprite: vi.fn().mockResolvedValue(true)
  }))
}));

describe('API Letr\'In Sprites - Tests Unifiés', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // COLLECTION (/api/letrin/sprites)
  // ==========================================
  describe('Collection (GET / POST)', () => {
    it('🟢 GET : doit lister les polices (200)', async () => {
      mockLean.mockResolvedValueOnce([{ uid: 'font_1', name: 'Cyber' }]);
      const req = new Request('http://localhost/api/letrin/sprites');
      const res = await getCollection();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data[0].name).toBe('Cyber');
    });

    it('🟢 POST : doit créer une police avec son slug (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindOneLean.mockResolvedValueOnce(null); // Pas de doublon de slug
      mockCreate.mockResolvedValueOnce({ uid: 'font_new', slug: 'cyber-font' });

      const req = new Request('http://localhost/api/letrin/sprites', {
        method: 'POST',
        body: JSON.stringify({ name: 'Cyber Font' })
      });

      const res = await postCollection(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  // ==========================================
  // PAR SLUG (/api/letrin/sprites/[slug])
  // ==========================================
  describe('Par Slug (GET / PUT / DELETE)', () => {
    const mockParams = { params: Promise.resolve({ slug: 'abyss-pixel' }) };

    it('🟢 GET : doit récupérer la police par son slug (200)', async () => {
      mockFindOneLean.mockResolvedValueOnce({ slug: 'abyss-pixel', name: 'Abyss Pixel' });
      
      const req = new Request('http://localhost/api/letrin/sprites/abyss-pixel');
      const res = await getBySlug(req, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.slug).toBe('abyss-pixel');
    });

    it('🔴 GET : doit renvoyer 404 si la police n\'existe pas', async () => {
      mockFindOneLean.mockResolvedValueOnce(null);
      
      const req = new Request('http://localhost/api/letrin/sprites/unknown');
      const res = await getBySlug(req, { params: Promise.resolve({ slug: 'unknown' }) });
      
      expect(res.status).toBe(404);
    });

    it('🟢 PUT : doit mettre à jour la police (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindOneAndUpdateLean.mockResolvedValueOnce({ slug: 'abyss-pixel', name: 'Updated' });

      const req = new Request('http://localhost/api/letrin/sprites/abyss-pixel', { 
        method: 'PUT', body: JSON.stringify({ name: 'Updated' }) 
      });
      const res = await putBySlug(req, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('🟢 DELETE : doit dissoudre la police (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindOneAndDelete.mockResolvedValueOnce({ slug: 'abyss-pixel' });

      const req = new Request('http://localhost/api/letrin/sprites/abyss-pixel', { method: 'DELETE' });
      const res = await deleteBySlug(req, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});