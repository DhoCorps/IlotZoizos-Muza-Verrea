import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/partita/[slug]/route'; // Ajuste le chemin selon ton arborescence
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, PartitaModel } from '@ilot/infrastructure';
import { PartitaOrchestrator } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  PartitaModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  PartitaOrchestrator: vi.fn().mockImplementation(() => ({
    updatePartita: vi.fn(),
    disintegratePartita: vi.fn(),
  })),
}));

describe('Partita Slug API [GET, PUT, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/partita/[slug]', () => {
    it('devrait retourner 404 si la partition est introuvable', async () => {
      vi.mocked(PartitaModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const req = new Request('http://localhost/api/partita/inconnue');
      const res = await GET(req, { params: Promise.resolve({ slug: 'inconnue' }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('évaporée');
    });

    it('devrait retourner 200 et la partition si elle est publique en appliquant le slugify', async () => {
      const mockPartition = { slug: 'ma-partition', status: 'PUBLISHED', authorUid: 'other-user' };
      vi.mocked(PartitaModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockPartition),
      } as any);

      const req = new Request('http://localhost/api/partita/Ma Partition!');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Ma Partition!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.slug).toBe('ma-partition');
      expect(PartitaModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'ma-partition' }, { uid: 'ma-partition' }]
      });
    });
  });

  describe('PUT /api/partita/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas identifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/partita/ma-partition', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Nouveau titre' }),
      });
      const res = await PUT(req, { params: Promise.resolve({ slug: 'ma-partition' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié');
    });

    it('devrait réussir (200) et muter la partition via l orchestrateur avec le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: [] },
      } as any);

      const mockUpdatePartita = vi.fn().mockResolvedValueOnce({ slug: 'ma-partition', title: 'Nouveau titre' });
      vi.mocked(PartitaOrchestrator).mockImplementationOnce(() => ({
        updatePartita: mockUpdatePartita,
        disintegratePartita: vi.fn(),
      } as any));

      const req = new Request('http://localhost/api/partita/Ma Partition!', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nouveau titre' }),
      });

      const res = await PUT(req, { params: Promise.resolve({ slug: 'Ma Partition!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.title).toBe('Nouveau titre');
      expect(mockUpdatePartita).toHaveBeenCalledWith(
        'ma-partition',
        { title: 'Nouveau titre' },
        { actorUid: 'user-bird-1', capabilities: [] }
      );
    });
  });

  describe('DELETE /api/partita/[slug]', () => {
    it('devrait retourner 401 si non authentifié lors de la dissolution', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/partita/ma-partition', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'ma-partition' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié');
    });

    it('devrait dissoudre la partition (200) via l orchestrateur avec le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: [] },
      } as any);

      const mockDisintegratePartita = vi.fn().mockResolvedValueOnce(true);
      vi.mocked(PartitaOrchestrator).mockImplementationOnce(() => ({
        updatePartita: vi.fn(),
        disintegratePartita: mockDisintegratePartita,
      } as any));

      const req = new Request('http://localhost/api/partita/Ma Partition!', {
        method: 'DELETE',
      });

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Ma Partition!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('cendres');
      expect(mockDisintegratePartita).toHaveBeenCalledWith(
        'ma-partition',
        { actorUid: 'user-bird-1', capabilities: [] }
      );
    });
  });
});