// src/services/__tests__/report.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateMediation, ReportPayload } from '../report.services';

describe('Report Service - Branche de la Paix', () => {
  const mockPayload: ReportPayload = {
    targetIdentifier: 'bird_toxique',
    reason: 'Ce chant brise l\'harmonie de la volière.'
  };

  beforeEach(() => {
    // On mocke la fonction fetch globale du navigateur
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('🟢 doit transmettre le signalement et retourner la réponse en cas de succès', async () => {
    const mockApiResponse = {
      success: true,
      message: "Le signalement a été scellé.",
      data: { uid: 'report_123', status: 'mediation' }
    };

    // On simule une réponse HTTP 201 (OK)
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const result = await initiateMediation(mockPayload);

    // Vérification de l'appel réseau
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockPayload),
    });

    // Vérification du retour
    expect(result).toEqual(mockApiResponse);
  });

  it('🔴 doit lever une erreur précise si l\'API renvoie une erreur métier (ex: 400 ou 404)', async () => {
    const mockErrorResponse = {
      error: "Souveraineté paradoxale : On ne peut pas se signaler soi-même."
    };

    // On simule une réponse HTTP 400 (Bad Request)
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => mockErrorResponse,
    } as Response);

    await expect(initiateMediation(mockPayload))
      .rejects
      .toThrow("Souveraineté paradoxale : On ne peut pas se signaler soi-même.");
  });

  it('🔥 doit lever une erreur générique en cas de fracture réseau absolue (fetch crash)', async () => {
    // On simule une erreur fatale (ex: plus d'internet, serveur éteint)
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(initiateMediation(mockPayload))
      .rejects
      .toThrow("Erreur de connexion à la Matrice.");
  });
});