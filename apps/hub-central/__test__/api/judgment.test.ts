// app/api/judgment/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/judgment/route';
import { NextResponse } from 'next/server';

// 🛡️ Mock du garde du corps pour injecter notre utilisateur
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, context: any) => {
    // On simule un architecte suprême
    const mockUser = { uid: 'bird_juge_supreme', capabilities: ['*'] };
    return handler(req, context, mockUser);
  }
}));

// 👈 CORRECTION ICI : vi.hoisted permet aux variables d'exister AVANT le vi.mock
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
}));

describe('Routes API - Tribunal de la Canopée (Judgment)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/judgment (Convocation des Jurés)', () => {
    it('🔴 doit rejeter (400) si les UIDs du plaignant et de l\'accusé manquent', async () => {
      const req = new Request('http://localhost/api/judgment?plaintiffId=plaignant_1'); // Manque defendant
      const res: NextResponse = await GET(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("sont requis");
    });

    it('🟢 doit renvoyer la liste des jurés impartiaux si les paramètres sont valides', async () => {
      mockSummon.mockResolvedValueOnce({ success: true, jurors: ['juror_1', 'juror_2', 'juror_3'] });

      const req = new Request('http://localhost/api/judgment?plaintiffId=bird_a&defendantId=bird_b');
      const res: NextResponse = await GET(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.jurors).toHaveLength(3);
      expect(mockSummon).toHaveBeenCalledWith('bird_a', 'bird_b', 5);
    });
  });

  describe('POST /api/judgment (Exécution de la Sentence)', () => {
    it('🔴 doit rejeter (400) si les paramètres de la sentence sont incomplets', async () => {
      const req = new Request('http://localhost/api/judgment', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_criminel' }) // Manque reportUid et judgmentLevel
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Paramètres incomplets");
    });

    it('🟢 doit exécuter la sentence et renvoyer un message d\'avertissement si une Grâce a été consommée', async () => {
      const mockResult = {
        success: true,
        targetUid: 'bird_canonical_criminel',
        appliedLevel: 0,
        usedGrace: true, // Le bouclier a fonctionné !
        newKarmaStatus: 'clear',
        strikes: 0,
        gracesRemaining: 2
      };
      mockExecute.mockResolvedValueOnce(mockResult);

      const req = new Request('http://localhost/api/judgment', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_criminel', reportUid: 'report_1', judgmentLevel: 1 })
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

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
        usedGrace: false, // Pas de grâce
        newKarmaStatus: 'quarantined',
        strikes: 3,
        gracesRemaining: 0
      };
      mockExecute.mockResolvedValueOnce(mockResult);

      const req = new Request('http://localhost/api/judgment', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_criminel', reportUid: 'report_2', judgmentLevel: 2 })
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("La sentence est tombée");
      expect(json.data.newKarmaStatus).toBe('quarantined');
    });
  });
});