import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/tasks/route';
import { TaskModel, ProjectModel, getNeo4jSession } from '@ilot/infrastructure';

// 🛡️ Mocks globaux
vi.mock('@ilot/infrastructure', () => ({
    TaskModel: {
        find: vi.fn(),
        findOne: vi.fn(),
    },
    ProjectModel: {
        findOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
}));

// 🪄 Mock de la classe TaskOrchestrator avec prototype fonctionnel
vi.mock('@ilot/shared-core', () => {
    return {
        TaskOrchestrator: class {
            fosterTask = vi.fn().mockResolvedValue({ uid: 'task_new_123', name: 'Atome Forgé' });
        }
    };
});

// 🛡️ Simulation du decorateur withAura pour injecter un utilisateur valide
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

describe('Route API : Atomes (Tasks) /api/tasks', () => {
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

    it('🟢 GET : doit renvoyer les tâches avec succès', async () => {
        vi.mocked(TaskModel.find).mockReturnValue({
            sort: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([{ uid: 'task_1', title: 'Tâche Test' }])
            })
        } as any);

        const req = new Request('http://localhost:3000/api/tasks');

        const res = await GET(req as any, {} as any
        );
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data[0].uid).toBe('task_1');
    });

    it('🟢 POST : doit créer un nouvel atome/tâche si autorisé', async () => {
        vi.mocked(ProjectModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValue({ uid: 'proj_123', creatorUid: 'bird_123' })
        } as any);

        const req = new Request('http://localhost:3000/api/tasks', {
            method: 'POST',
            body: JSON.stringify({ projectUid: 'proj_123', name: 'Nouvel Atome' }),
            headers: { 'Content-Type': 'application/json' },
        });

        const res = await POST(req as any, {} as any);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.uid).toBe('task_new_123');
    });
});