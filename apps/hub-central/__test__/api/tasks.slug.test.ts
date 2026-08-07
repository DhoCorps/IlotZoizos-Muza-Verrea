import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/tasks/[slug]/route'; // Assure-toi que le dossier s'appelle bien [slug]
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { TaskOrchestrator } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  TaskModel: {
    findOne: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => {
          if (key === 'isDirectlyInvolved') return true;
          if (key === 'projectCaps') return [];
          if (key === 'teamDefaultCaps') return [];
          if (key === 'teamRel') return null;
          return null;
        }
      }]
    }),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@ilot/shared-core', () => ({
  TaskOrchestrator: vi.fn().mockImplementation(() => ({
    updateTask: vi.fn(),
    disintegrateTask: vi.fn(),
  })),
}));

describe('Task Slug API [GET, PATCH, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tasks/[slug]', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/tasks/mon-atome');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Mon Atome!' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Oiseau non identifié.');
    });

    it('devrait réussir (200) et ausculter l atome en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockTask = { uid: 'mon-atome', title: 'Atome Test' };
      vi.mocked(TaskModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTask),
      } as any);

      const req = new Request('http://localhost/api/tasks/mon-atome');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Mon Atome!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.uid).toBe('mon-atome');
      expect(TaskModel.findOne).toHaveBeenCalledWith({ uid: 'mon-atome' });
    });
  });

  describe('PATCH /api/tasks/[slug]', () => {
    it('devrait réussir (200) et muter l atome avec le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockUpdateTask = vi.fn().mockResolvedValueOnce({ uid: 'mon-atome', status: 'COMPLETED' });
      vi.mocked(TaskOrchestrator).mockImplementationOnce(() => ({
        updateTask: mockUpdateTask,
        disintegrateTask: vi.fn(),
      } as any));

      const req = new Request('http://localhost/api/tasks/mon-atome', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ slug: 'Mon Atome!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('COMPLETED');
      expect(mockUpdateTask).toHaveBeenCalledWith(
        'mon-atome',
        { status: 'COMPLETED' },
        expect.any(Object)
      );
    });
  });

  describe('DELETE /api/tasks/[slug]', () => {
    it('devrait réussir (200) et désintégrer l atome avec le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1' },
      } as any);

      const mockDisintegrate = vi.fn().mockResolvedValueOnce(true);
      vi.mocked(TaskOrchestrator).mockImplementationOnce(() => ({
        updateTask: vi.fn(),
        disintegrateTask: mockDisintegrate,
      } as any));

      const req = new Request('http://localhost/api/tasks/mon-atome', {
        method: 'DELETE',
      });

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Mon Atome!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('poussière');
      expect(mockDisintegrate).toHaveBeenCalledWith(
        'mon-atome',
        expect.any(Object)
      );
    });
  });
});