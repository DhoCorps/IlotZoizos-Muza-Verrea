import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/tasks/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { TaskModel } from '@ilot/infrastructure';
import { TaskOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
  revalidateTag: vi.fn(),
}));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => (key === 'isDirectlyInvolved' ? true : [])
      }]
    }),
    close: vi.fn()
  }),
  TaskModel: { findOne: vi.fn() },
}));
vi.mock('@ilot/shared-core', () => ({
  TaskOrchestrator: vi.fn().mockImplementation(() => ({
    updateTask: vi.fn().mockResolvedValue({ uid: 'task-1', name: 'Atome Muté' }),
    disintegrateTask: vi.fn().mockResolvedValue(true),
  })),
}));

describe('Route API : Atome Individuel ([slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('GET - doit ausculter l\'atome si autorisé', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123', capabilities: [] } } as any);
    vi.mocked(TaskModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'task-1', name: 'Atome Alpha' })
    } as any);

    const req = new Request('http://localhost/api/tasks/task-1');
    const response = await GET(req as any, { params: Promise.resolve({ slug: 'task-1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.uid).toBe('task-1');
  });

  it('PATCH - doit faire muter l\'atome et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123', capabilities: [] } } as any);

    const req = new Request('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Atome Muté' }),
    });

    const response = await PATCH(req as any, { params: Promise.resolve({ slug: 'task-1' }) });
    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('task-task-1');
  });

  it('DELETE - doit désintégrer l\'atome et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123', capabilities: [] } } as any);

    const req = new Request('http://localhost/api/tasks/task-1', {
      method: 'DELETE',
    });

    const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'task-1' }) });
    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('task-task-1');
  });
});