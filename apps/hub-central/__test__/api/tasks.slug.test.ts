import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../../app/api/tasks/[slug]/route';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure';

// 🛡️ Mocks globaux de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
    TaskModel: {
        findOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
}));

// 🪄 Mock de la classe TaskOrchestrator
vi.mock('@ilot/shared-core', () => {
    return {
        TaskOrchestrator: class {
            updateTask = vi.fn().mockResolvedValue({ uid: 'task_123', name: 'Atome Muté' });
            disintegrateTask = vi.fn().mockResolvedValue(true);
        }
    };
});

// 🛡️ Simulation de l'API Guard withAura
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: any) => async (req: Request, context: any) => {
        const currentUser = { uid: 'bird_123', capabilities: ['*'] };
        return handler(req, context, currentUser);
    },
}));

vi.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
    revalidateTag: vi.fn(),
}));

describe('Route API : Atome Individuel ([slug])', () => {
    let mockNeoSession: { run: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = undefined;
        mockNeoSession = {
            run: vi.fn().mockResolvedValue({ records: [] }),
            close: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as any);
    });

    it('🟢 GET : doit ausculter l\'atome si autorisé', async () => {
        vi.mocked(TaskModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValue({ uid: 'task_123', title: 'Atome Silice' })
        } as any);

        const req = new Request('http://localhost:3000/api/tasks/task_123');
        const context = { params: Promise.resolve({ slug: 'task_123' }) };

        const res = await GET(req as any, context as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.uid).toBe('task_123');
    });

    it('🟢 PATCH : doit faire muter l\'atome et renvoyer les données mises à jour', async () => {
        const req = new Request('http://localhost:3000/api/tasks/task_123', {
            method: 'PATCH',
            body: JSON.stringify({ title: 'Mutation de l Atome' }),
            headers: { 'Content-Type': 'application/json' },
        });
        const context = { params: Promise.resolve({ slug: 'task_123' }) };

        const res = await PATCH(req as any, context as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.name).toBe('Atome Muté');
    });

    it('🟢 DELETE : doit désintégrer l\'atome avec succès', async () => {
        const req = new Request('http://localhost:3000/api/tasks/task_123', {
            method: 'DELETE',
        });
        const context = { params: Promise.resolve({ slug: 'task_123' }) };

        const res = await DELETE(req as any, context as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.message).toContain('poussière du Nexus');
    });
});