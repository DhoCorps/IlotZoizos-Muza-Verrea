import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/resonance/echoes/route';
import { ResonanceModel } from '@ilot/infrastructure';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécution immédiate pour le test
  revalidateTag: vi.fn(),
}));

// Neutralisation des gardes d'API pour les tests unitaires
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = { id: '1', uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ResonanceModel: {
    find: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  ResonanceOrchestrator: {
    addSocialEcho: vi.fn(),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Resonance Echoes (GET / POST /api/resonance/echoes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET - Écouter les résonances', () => {
    it('🔴 doit rejeter (400) si le paramètre targetUid est absent', async () => {
      const req = new Request('http://localhost/api/resonance/echoes');
      const res = await GET(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Cible de résonance manquante.");
    });

    it('🟢 doit renvoyer les échos pour une cible valide (200)', async () => {
      vi.mocked(ResonanceModel.find).mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: vi.fn().mockResolvedValue([{ uid: 'echo-1', content: 'Murmure...' }]),
          }),
        }),
      } as any);

      const req = new Request('http://localhost/api/resonance/echoes?targetUid=task-1');
      const res = await GET(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].content).toBe('Murmure...');
    });
  });

  describe('POST - Propager un Écho', () => {
    it('🔴 doit rejeter (400) si le corps de la requête est malformé', async () => {
      const req = new Request('http://localhost/api/resonance/echoes', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'schema' }),
      });

      const res = await POST(req as any, {});
      expect(res.status).toBe(400);
    });

    it('🟢 doit propager un écho, l\'inscrire dans le Graphe et la Silice, et invalider le cache (201)', async () => {
      vi.mocked(ResonanceOrchestrator.addSocialEcho).mockResolvedValueOnce({
        echoUid: 'echo-new-1',
        status: 'propagated',
      } as any);

      vi.mocked(ResonanceModel.create).mockResolvedValueOnce([
        { uid: 'echo-new-1', content: 'Bel écho !' },
      ] as any);

      const payload = {
        targetUid: 'task-1',
        targetLabel: 'Task',
        echoType: 'TEXT',
        content: 'Bel écho !',
      };

      const req = new Request('http://localhost/api/resonance/echoes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.echo.uid).toBe('echo-new-1');

      // 💥 Vérification de l'invalidation chirurgicale du cache en cascade
      expect(revalidateTag).toHaveBeenCalledWith('resonance-echoes');
      expect(revalidateTag).toHaveBeenCalledWith('echoes-task-1');
      expect(revalidateTag).toHaveBeenCalledWith('entity-task-1');
    });
  });
});