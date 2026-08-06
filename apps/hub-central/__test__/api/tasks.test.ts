import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/tasks/route';
import { getServerSession } from 'next-auth/next';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockRun = vi.fn().mockResolvedValue({
  records: [{ get: () => ['task_1'] }]
});
const mockClose = vi.fn();
const mockFindOne = vi.fn().mockImplementation(() => ({
  lean: vi.fn().mockResolvedValue({ uid: 'proj_1', creatorUid: 'bird_1' })
}));
const mockFindLean = vi.fn().mockResolvedValue([
  { uid: 'task_1', title: 'Atome Fondamental' }
]);
const mockConnectToDatabase = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args),
  getNeo4jSession: vi.fn().mockImplementation(() => ({
    run: mockRun,
    close: mockClose
  })),
  ProjectModel: {
    findOne: (...args: any[]) => mockFindOne(...args)
  },
  TaskModel: {
    find: vi.fn().mockImplementation(() => ({
      sort: vi.fn().mockImplementation(() => ({
        lean: mockFindLean
      }))
    }))
  }
}));

const mockFosterTask = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  TaskOrchestrator: vi.fn().mockImplementation(() => ({
    fosterTask: mockFosterTask
  }))
}));

describe('API Tasks - Collection / Clairière (/api/tasks)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
    mockRun.mockResolvedValue({
      records: [{ get: () => ['task_1'] }]
    });
  });

  // ==========================================
  // TESTS POUR LE GET
  // ==========================================
  describe('Parcours (GET)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/tasks');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('🟢 doit lister les atomes d’un chantier avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      const req = new Request('http://localhost/api/tasks?projectUid=proj_1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].title).toBe('Atome Fondamental');
    });

    it('🟢 doit lister les atomes assignés en mode personnel sans projectUid (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      const req = new Request('http://localhost/api/tasks');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ==========================================
  // TESTS POUR LE POST (FONDATION)
  // ==========================================
  describe('Fondation (POST)', () => {
    it('🔴 doit rejeter si l’Oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ projectUid: 'proj_1', title: 'Nouvel Atome' })
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si le projectUid est absent (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1' }
      } as any);

      const req = new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nouvel Atome' }) // Sans projectUid
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('🟢 doit fonder un nouvel Atome avec succès (201)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'bird_1', capabilities: ['*'] }
      } as any);

      mockFosterTask.mockResolvedValueOnce({ uid: 'task_new', title: 'Nouvel Atome' });

      const req = new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ projectUid: 'proj_1', title: 'Nouvel Atome' })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.title).toBe('Nouvel Atome');
      expect(mockFosterTask).toHaveBeenCalled();
    });
  });
});