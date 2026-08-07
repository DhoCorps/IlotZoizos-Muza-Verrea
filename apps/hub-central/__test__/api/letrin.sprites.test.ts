import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/letrin/sprites/[slug]/route'; // Ajuste le chemin selon ton arborescence
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, LetterSpriteModel } from '@ilot/infrastructure';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  LetterSpriteModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

describe('LetrIn Sprite Slug API [GET, PUT, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/letrin/sprites/[slug]', () => {
    it('devrait retourner 404 si la police est introuvable', async () => {
      vi.mocked(LetterSpriteModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const req = new Request('http://localhost/api/letrin/sprites/inconnue');
      const res = await GET(req, { params: Promise.resolve({ slug: 'inconnue' }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Police introuvable.');
    });

    it('devrait retourner 200 et la police en appliquant le slugify', async () => {
      const mockSprite = { slug: 'ma-super-police', name: 'Super Police' };
      vi.mocked(LetterSpriteModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockSprite),
      } as any);

      const req = new Request('http://localhost/api/letrin/sprites/Ma Super Police!');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Ma Super Police!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockSprite);
      expect(LetterSpriteModel.findOne).toHaveBeenCalledWith({ slug: 'ma-super-police' });
    });
  });

  describe('PUT /api/letrin/sprites/[slug]', () => {
    it('devrait retourner 401 si non authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/letrin/sprites/ma-super-police', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Modifié' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'ma-super-police' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('non identifié');
    });

    it('devrait mettre à jour la police avec succès (200) en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockUpdated = { slug: 'ma-super-police', name: 'Modifié' };
      vi.mocked(LetterSpriteModel.findOneAndUpdate).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockUpdated),
      } as any);

      const req = new Request('http://localhost/api/letrin/sprites/Ma Super Police!', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Modifié' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'Ma Super Police!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUpdated);
      expect(LetterSpriteModel.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: 'ma-super-police' },
        { $set: { name: 'Modifié' } },
        { new: true }
      );
    });
  });

  describe('DELETE /api/letrin/sprites/[slug]', () => {
    it('devrait retourner 401 si non authentifié lors de la suppression', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/letrin/sprites/ma-super-police', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'ma-super-police' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('non identifié');
    });

    it('devrait dissoudre la police avec succès (200) en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      vi.mocked(LetterSpriteModel.findOneAndDelete).mockResolvedValueOnce({ slug: 'ma-super-police' } as any);

      const req = new Request('http://localhost/api/letrin/sprites/Ma Super Police!', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Ma Super Police!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(LetterSpriteModel.findOneAndDelete).toHaveBeenCalledWith({ slug: 'ma-super-police' });
    });
  });
});