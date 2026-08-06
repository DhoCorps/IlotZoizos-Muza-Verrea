import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH, DELETE } from '../../app/api/tasks/[slug]/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockRun = vi.fn().mockResolvedValue({
  records: [{ get: () => [['task:read', 'task:update', 'task:delete']] }]
});
const mockClose = vi.fn();
const mockFindOneLean = vi.fn();
const mockConnectToDatabase = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args),
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mockRun,
    close: mockClose
  })),
  TaskModel: {
    findOne: vi.fn().mockImplementation(() => ({
      lean: mockFindOneLean
    }))
  }
}));

const mockUpdateTask = vi.fn();
const mockDisintegrateTask = vi.fn();
const mockFosterTask = vi.fn();

vi.mock('@ilot/shared-core', () => ({
  TaskOrchestrator: vi.fn().mockImplementation(() => ({
    updateTask: mockUpdateTask,
    disintegrateTask: mockDisintegrateTask,
    fosterTask: mockFosterTask
  }))
}));

describe('API Tasks - Par ID / Atome (/api/tasks/[taskId])', () => {
  const mockParams = { params: Promise.resolve({ taskId: 'task_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    mockRun.mockResolvedValue({
      records: [{ get: () => [['task:read', 'task:update', 'task:delete']] }]
    });
  });

  // ==========================================
  // TESTS POUR LE GET
  // ==========================================
  describe('Consultation (GET)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🟢 doit ausculter l’Atome avec succès et renvoyer ses capacités (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFindOneLean.mockResolvedValueOnce({ uid: 'task_1', title: 'Atome Central' });

      const req = new Request('http://localhost/api');
      const res = await GET(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.title).toBe('Atome Central');
      expect(data.myCapabilities).toBeDefined();
    });
  });

  // ==========================================
  // TESTS POUR LE POST (SOUS-TÂCHE)
  // ==========================================
  describe('Fondation de sous-atome (POST)', () => {
    it('🟢 doit créer un sous-atome Matrioshka avec succès (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockFosterTask.mockResolvedValueOnce({ uid: 'subtask_1', title: 'Fille' });

      const req = new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ action: 'CREATE_SUBTASK', data: { title: 'Fille' } })
      });

      const res = await POST(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.title).toBe('Fille');
      expect(mockFosterTask).toHaveBeenCalledWith(
        expect.objectContaining({ parentUid: 'task_1', title: 'Fille' }),
        expect.any(Object)
      );
    });
  });

  // ==========================================
  // TESTS POUR LE PATCH (MUTATION)
  // ==========================================
  describe('Mutation (PATCH)', () => {
    it('🟢 doit faire muter l’Atome avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockUpdateTask.mockResolvedValueOnce({ uid: 'task_1', status: 'DONE' });

      const req = new Request('http://localhost/api', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DONE' })
      });

      const res = await PATCH(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('DONE');
      expect(mockUpdateTask).toHaveBeenCalledWith('task_1', { status: 'DONE' }, expect.any(Object));
    });
  });

  // ==========================================
  // TESTS POUR LE DELETE (DÉSINTEGRATION)
  // ==========================================
  describe('Désintégration (DELETE)', () => {
    it('🟢 doit désintégrer l’Atome avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      mockDisintegrateTask.mockResolvedValueOnce(true);

      const req = new Request('http://localhost/api', {
        method: 'DELETE'
      });

      const res = await DELETE(req as any, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Correction de l'assertion sur le message exact retourné par la route
      expect(data.message).toContain('poussière');
      expect(mockDisintegrateTask).toHaveBeenCalledWith('task_1', expect.any(Object));
    });
  });
});