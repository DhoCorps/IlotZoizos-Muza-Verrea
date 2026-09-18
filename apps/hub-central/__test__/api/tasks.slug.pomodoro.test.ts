import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tasks/[slug]/pomodoro/route';
import { TaskModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { TaskOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    TaskModel: { findOne: vi.fn() },
    findEntityBySlugOrUid: vi.fn(),
    getNeo4jSession: vi.fn(),
  };
});

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('Route API : Pomodoro (POST /api/tasks/[slug]/pomodoro)', () => {
  let mockNeoSession: { run: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
    mockNeoSession = {
      run: vi.fn().mockResolvedValue({ records: [{ get: () => true }] }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as unknown as ReturnType<typeof getNeo4jSession>);
  });

  it('doit rejeter (401) si l\'utilisateur n\'est pas connecté', async () => {
    const req = new NextRequest('http://localhost/api/tasks/my-task/pomodoro', { method: 'POST' });
    const response = await POST(req, { params: Promise.resolve({ slug: 'my-task' }) });
    expect(response.status).toBe(401);
  });

  it('doit renvoyer 404 si l\'atome est introuvable', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/tasks/inconnue/pomodoro', { method: 'POST' });
    const response = await POST(req, { params: Promise.resolve({ slug: 'inconnue' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain('Atome introuvable');
  });

  it('doit valider le cycle Pomodoro avec succès (200) et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'task_123',
      slug: 'ma-tache',
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    vi.spyOn(TaskOrchestrator.prototype, 'completePomodoro').mockResolvedValueOnce({
      uid: 'task_123',
      pomodoros: { estimated: 2, completed: 1 }
    } as unknown as Awaited<ReturnType<TaskOrchestrator['completePomodoro']>>);

    const req = new NextRequest('http://localhost/api/tasks/ma-tache/pomodoro', { method: 'POST' });
    const response = await POST(req, { params: Promise.resolve({ slug: 'ma-tache' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.pomodoros.completed).toBe(1);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TaskModel, 'ma-tache');

    expect(revalidateTag).toHaveBeenCalledWith('tasks');
    expect(revalidateTag).toHaveBeenCalledWith('task-ma-tache');
    expect(revalidateTag).toHaveBeenCalledWith('task-task_123');
  });
});