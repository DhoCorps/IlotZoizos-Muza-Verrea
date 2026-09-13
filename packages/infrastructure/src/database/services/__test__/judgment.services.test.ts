// src/services/__tests__/judgment.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { summonJurors, executeJudgment, JudgmentPayload } from '../judgment.services';

describe('Judgment Service - Le Tribunal de la Canopée', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('summonJurors', () => {
    it('🟢 doit convoquer les jurés avec succès', async () => {
      const mockResponse = { success: true, jurors: ['j1', 'j2', 'j3'] };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await summonJurors('plaignant', 'accuse');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/judgment?plaintiffId=plaignant&defendantId=accuse', expect.any(Object));
      expect(result).toEqual(mockResponse);
    });

    it('🔥 doit lever une erreur propre en cas de fracture réseau', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Failed to fetch"));

      await expect(summonJurors('p1', 'a1'))
        .rejects
        .toThrow("Erreur de connexion à la Matrice lors de la convocation.");
    });
  });

  describe('executeJudgment', () => {
    const mockPayload: JudgmentPayload = {
      targetIdentifier: 'bird_accuse',
      reportUid: 'rep_123',
      judgmentLevel: 2
    };

    it('🟢 doit exécuter la sentence et renvoyer les données karmiques', async () => {
      const mockResponse = {
        success: true,
        message: "La sentence est tombée.",
        data: { usedGrace: false, strikes: 2 }
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await executeJudgment(mockPayload);
      expect(global.fetch).toHaveBeenCalledWith('/api/judgment', expect.any(Object));
      expect(result).toEqual(mockResponse);
    });

    it('🔴 doit lever une erreur si l\'API renvoie une faute métier (ex: 403)', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Aura insuffisante pour prononcer un jugement." }),
      } as Response);

      await expect(executeJudgment(mockPayload))
        .rejects
        .toThrow("Aura insuffisante pour prononcer un jugement.");
    });
  });
});