import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/judgment/route';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// 🛡️ Mock du garde du corps pour injecter notre utilisateur
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const mockUser = { uid: 'bird_juge_supreme', capabilities: ['*'] };
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number; statusCode?: number }).status || (error as { statusCode?: number }).statusCode || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

// 👈 vi.hoisted permet aux variables d'exister AVANT le vi.mock
const { mockSummon, mockExecute } = vi.hoisted(() => ({
  mockSummon: vi.fn(),
  mockExecute: vi.fn()
}));

// On utilise une vraie structure de classe pour l'Orchestrateur
vi.mock('@ilot/shared-core', () => ({
  KarmaOrchestrator: class {
    summonImpartialJurors = mockSummon;
    executeJudgmentSanction = mockExecute;
  }
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('Routes API - Tribunal de la Canopée (Judgment)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/judgment (Convocation des Jurés)', () => {
    it('🔴 doit rejeter (400) si les UIDs du plaignant et de l\'accusé manquent', async () => {
      const req = new NextRequest('http://localhost/api/judgment?plaintiffId=plaignant_1');
      const res = await getHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; error: string };

      expect(res.status).toBe(400);
      expect(json.error).toContain("sont requis");
    });

    it('🟢 doit renvoyer la liste des jurés impartiaux si les paramètres sont valides', async () => {
      mockSummon.mockResolvedValueOnce({ success: true, jurors: ['juror_1', 'juror_2', 'juror_3'] });

      const req = new NextRequest('http://localhost/api/judgment?plaintiffId=bird_a&defendantId=bird_b');
      const res = await getHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; jurors: Array<string> };

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.jurors).toHaveLength(3);
      expect(mockSummon).toHaveBeenCalledWith('bird_a', 'bird_b', 5);
    });
  });

  describe('POST /api/judgment (Exécution de la Sentence)', () => {
    it('🔴 doit rejeter (400) si les paramètres de la sentence sont incomplets', async () => {
      const req = new NextRequest('http://localhost/api/judgment', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_criminel' }) // Manque reportUid et judgmentLevel
      });

      const res = await postHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; error: string };

      expect(res.status).toBe(400);
      expect(json.error).toContain("Paramètres incomplets");
    });

    it('🟢 doit exécuter la sentence et renvoyer un message d\'avertissement si une Grâce a été consommée', async () => {
      const mockResult = {
        success: true,
        targetUid: 'bird_canonical_criminel',
        appliedLevel: 1,
        usedGrace: true,
        newKarmaStatus: 'clear',
        strikes: 0,
        gracesRemaining: 2
      };
      mockExecute.mockResolvedValueOnce(mockResult);

      const req = new NextRequest('http://localhost/api/judgment', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_criminel', reportUid: 'report_1', judgmentLevel: 1 })
      });

      const res = await postHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; message: string; data: { usedGrace: boolean } };

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("Le Bouclier Karmique a absorbé le choc");
      expect(json.data.usedGrace).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('🔥 doit exécuter une sentence ferme si le Bouclier Karmique est brisé ou inutilisable', async () => {
      const mockResult = {
        success: true,
        targetUid: 'bird_canonical_criminel',
        appliedLevel: 2,
        usedGrace: false,
        newKarmaStatus: 'quarantined',
        strikes: 3,
        gracesRemaining: 0
      };
      mockExecute.mockResolvedValueOnce(mockResult);

      const req = new NextRequest('http://localhost/api/judgment', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_criminel', reportUid: 'report_2', judgmentLevel: 2 })
      });

      const res = await postHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; message: string; data: { newKarmaStatus: string } };

      expect(res.status).toBe(200);
      expect(json.message).toContain("La sentence est tombée");
      expect(json.data.newKarmaStatus).toBe('quarantined');
    });
  });
});