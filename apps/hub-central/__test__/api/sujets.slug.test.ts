import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/sujets/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  SujetModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  SujetOrchestrator: vi.fn().mockImplementation(() => ({
    disintegrateSujet: vi.fn(),
  })),
}));

describe('Abyss Sujet Slug API [GET, PUT, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/abyss/sujets/[slug]', () => {
    it('devrait retourner 404 si le sujet est introuvable', async () => {
      vi.mocked(SujetModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const req = new Request('http://localhost/api/abyss/sujets/inconnu');
      const res = await GET(req, { params: Promise.resolve({ slug: 'inconnu' }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('évaporé');
    });

    it('devrait retourner 200 et le sujet s il est publié en appliquant slugify', async () => {
      const mockSujet = { slug: 'mon-sujet', status: 'PUBLISHED', authorUid: 'user-2' };
      vi.mocked(SujetModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockSujet),
      } as any);

      const req = new Request('http://localhost/api/abyss/sujets/Mon Sujet!');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Mon Sujet!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockSujet);
      expect(SujetModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-sujet' }, { uid: 'mon-sujet' }]
      });
    });
  });

  describe('PUT /api/abyss/sujets/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas identifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/abyss/sujets/mon-sujet', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Nouveau titre' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié.');
    });

    it('devrait réussir (200) et muter le sujet avec slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-1', capabilities: [] },
      } as any);

      const mockSujetDoc = { uid: 'suj-1', slug: 'mon-sujet', authorUid: 'user-1' };
      vi.mocked(SujetModel.findOne).mockResolvedValueOnce(mockSujetDoc as any);

      const mockUpdated = { ...mockSujetDoc, title: 'Nouveau titre' };
      vi.mocked(SujetModel.findOneAndUpdate).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockUpdated),
      } as any);

      const req = new Request('http://localhost/api/abyss/sujets/Mon Sujet!', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nouveau titre' }),
      });

      const res = await PUT(req, { params: Promise.resolve({ slug: 'Mon Sujet!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Nouveau titre');
      expect(SujetModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-sujet' }, { uid: 'mon-sujet' }]
      });
    });
  });

  describe('DELETE /api/abyss/sujets/[slug]', () => {
    it('devrait retourner 401 si non authentifié lors de la suppression', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/abyss/sujets/mon-sujet', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié.');
    });

    it('devrait réussir (200) et désintégrer le sujet avec slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-1', capabilities: [] },
      } as any);

      const mockSujetDoc = { uid: 'suj-1', slug: 'mon-sujet', authorUid: 'user-1' };
      vi.mocked(SujetModel.findOne).mockResolvedValueOnce(mockSujetDoc as any);

      const mockDisintegrate = vi.fn().mockResolvedValueOnce(true);
      vi.mocked(SujetOrchestrator).mockImplementationOnce(() => ({
        disintegrateSujet: mockDisintegrate,
      } as any));

      const req = new Request('http://localhost/api/abyss/sujets/Mon Sujet!', {
        method: 'DELETE',
      });

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Mon Sujet!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('cendres');
      expect(mockDisintegrate).toHaveBeenCalledWith(
        'suj-1',
        { actorUid: 'user-1', capabilities: [] }
      );
    });
  });
});