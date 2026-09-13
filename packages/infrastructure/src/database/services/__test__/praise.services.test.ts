// src/services/__tests__/praise.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPraises, createPraise, PraisePayload } from '../praise.services';

describe('Praise Service - Le Panthéon des Éloges', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPraises', () => {
    it('🟢 doit récupérer la liste des éloges avec succès', async () => {
      const mockPraises = [{ uid: 'p_1', text: 'Magnifique travail !', type: 'gratitude' }];
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPraises }),
      } as Response);

      const result = await fetchPraises('bird_test');

      expect(global.fetch).toHaveBeenCalledWith('/api/praises?targetUid=bird_test', expect.any(Object));
      expect(result).toEqual(mockPraises);
    });

    it('🔥 doit lever une erreur en cas de fracture réseau', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Failed to fetch"));

      await expect(fetchPraises('bird_test'))
        .rejects
        .toThrow("Erreur de connexion à la Matrice lors de la lecture du Panthéon.");
    });
  });

  describe('createPraise', () => {
    const mockPayload: PraisePayload = {
      targetIdentifier: 'bird_cible',
      text: 'Merci pour ta bienveillance.',
      type: 'civic'
    };

    it('🟢 doit graver l\'éloge et retourner le succès', async () => {
      const mockResponse = { success: true, message: 'Éloge gravé' };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await createPraise(mockPayload);

      expect(global.fetch).toHaveBeenCalledWith('/api/praises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });
      expect(result).toEqual(mockResponse);
    });

    it('🔴 doit lever une erreur si l\'API refuse l\'éloge (ex: auto-éloge)', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "On ne peut s'adresser des éloges à soi-même." }),
      } as Response);

      await expect(createPraise(mockPayload))
        .rejects
        .toThrow("On ne peut s'adresser des éloges à soi-même.");
    });
  });
});