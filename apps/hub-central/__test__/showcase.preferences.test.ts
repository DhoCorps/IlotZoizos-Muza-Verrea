// apps/hub-central/__test__/api/showcase.preferences.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/showcase/preferences/route';
import { UniversalMediaModel } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';

// 1. Mock du modèle UniversalMediaModel pour éviter les appels réseau réels
vi.mock('@ilot/infrastructure', () => ({
  UniversalMediaModel: {
    updateMany: vi.fn(),
  },
}));

describe('POST /api/showcase/preferences - Route API de Configuration Granulaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit mettre à jour les préférences de consentement avec succès (200)', async () => {
    vi.mocked(UniversalMediaModel.updateMany).mockResolvedValueOnce({ modifiedCount: 2 } as any);

    const req = new NextRequest('http://localhost/api/showcase/preferences', {
      method: 'POST',
      body: JSON.stringify({
        ownerUid: 'bird_alpha',
        sourceApp: 'ABYSS',
        consentForShowcase: true,
        consentForMusicSync: false,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.ownerUid).toBe('bird_alpha');
    expect(UniversalMediaModel.updateMany).toHaveBeenCalledWith(
      { ownerUid: 'bird_alpha', sourceApp: 'ABYSS' },
      { $set: { consentForShowcase: true, consentForMusicSync: false } }
    );
  });

  it('doit retourner une erreur 400 si l\'identifiant d\'oiseau (ownerUid) est absent', async () => {
    const req = new NextRequest('http://localhost/api/showcase/preferences', {
      method: 'POST',
      body: JSON.stringify({
        consentForShowcase: true,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Identifiant d\'oiseau');
    expect(UniversalMediaModel.updateMany).not.toHaveBeenCalled();
  });

  it('doit retourner une erreur 500 en cas de défaillance interne de la Silice', async () => {
    vi.mocked(UniversalMediaModel.updateMany).mockRejectedValueOnce(new Error('Erreur Silice MongoDB'));

    const req = new NextRequest('http://localhost/api/showcase/preferences', {
      method: 'POST',
      body: JSON.stringify({
        ownerUid: 'bird_beta',
        consentForShowcase: false,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Erreur Silice MongoDB');
  });
});