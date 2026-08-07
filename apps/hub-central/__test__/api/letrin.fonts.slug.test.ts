import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '@/app/api/letrin/fonts/[slug]/route'; // Ajuste le chemin selon ton arborescence
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, FontProject } from '@ilot/infrastructure';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  FontProject: {
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

describe('Font Project Slug API [PUT, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT /api/fonts/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/fonts/mon-projet', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nouveau nom' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'Mon Projet' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('non identifié');
    });

    it('devrait mettre à jour le projet et retourner 200 avec le slugify appliqué', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockUpdated = { slug: 'mon-projet', name: 'Nouveau nom' };
      vi.mocked(FontProject.findOneAndUpdate).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockUpdated),
      } as any);

      const req = new Request('http://localhost/api/fonts/Mon Projet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nouveau nom' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'Mon Projet' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUpdated);
      expect(FontProject.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: 'mon-projet' },
        { name: 'Nouveau nom' },
        { new: true }
      );
      expect(connectToDatabase).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/fonts/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié lors de la suppression', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/fonts/mon-projet', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-projet' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('non identifié');
    });

    it('devrait supprimer le projet avec succès (200) en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      vi.mocked(FontProject.findOneAndDelete).mockResolvedValueOnce({ slug: 'mon-projet' } as any);

      const req = new Request('http://localhost/api/fonts/Mon Projet', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Mon Projet' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(FontProject.findOneAndDelete).toHaveBeenCalledWith({ slug: 'mon-projet' });
    });
  });
});