import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/tasks/route';
import { getServerSession } from 'next-auth/next';
import { TaskModel, ProjectModel } from '@ilot/infrastructure';
import { TaskOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
  revalidateTag: vi.fn(),
}));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ records: [] }), close: vi.fn() }),
  TaskModel: { find: vi.fn() },
  ProjectModel: { findOne: vi.fn() },
}));
vi.mock('@ilot/shared-core', () => ({
  TaskOrchestrator: vi.fn().mockImplementation(() => ({
    fosterTask: vi.fn().mockResolvedValue({ uid: 'task-123' }),
  })),
}));

describe('Route API : Atomes (Tasks)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('GET - doit renvoyer les tâches', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123', capabilities: [] } } as any);
    vi.mocked(TaskModel.find).mockReturnValue({
        sort: () => ({ lean: vi.fn().mockResolvedValue([{ uid: 't1' }]) })
    } as any);

    const req = new Request('http://localhost/api/tasks');
    const response = await GET(req as any, {});
    expect(response.status).toBe(200);
  });

  it('POST - doit créer une tâche si autorisé', async () => {
    // 🪡 Ajout sécurisé des capabilities dans le mock de session
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123', capabilities: [] } } as any);
    vi.mocked(ProjectModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ uid: 'p-1', creatorUid: 'u-123' }) } as any);

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ projectUid: 'p-1', name: 'Atome 1' }),
    });

    const response = await POST(req as any, {});
    expect(response.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith('project-p-1');
  });
});