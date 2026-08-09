import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/economy/unlock/route';
import { EconomyService } from '@ilot/infrastructure';

// 🛡️ MOCK GLOBAL : Next Cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: unknown = await importOriginal();
  return {
    ...(actual as object),
    EconomyService: {
      unlockFeature: vi.fn(),
    }
  };
});

// 🛡️ MOCK DU GARDE D'AURA
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: unknown) => async (req: Request, context: unknown) => {
    return (handler as Function)(req, context, { uid: 'bird_artist_1', capabilities: ['*'] });
  },
}));

describe('POST /api/economy/unlock - Déverrouillage par artefacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit déverrouiller un outil Letrin avec succès si les fonds sont suffisants (200)', async () => {
    // Le mock renvoie l'inventaire mis à jour
    const mockInventory = {
      unlockedUnlocks: ['letrin_bucket'],
      parchemins: 0,
      plumes: 5, // Il lui en reste 5 après l'achat
      vinyles: 2,
      totamtoes: 10
    };
    
    vi.mocked(EconomyService.unlockFeature).mockResolvedValue(mockInventory as any);

    const req = new Request('http://localhost/api/economy/unlock', {
      method: 'POST',
      body: JSON.stringify({ featureId: 'letrin_bucket' })
    });

    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.unlockedUnlocks).toContain('letrin_bucket');
    expect(EconomyService.unlockFeature).toHaveBeenCalledWith('bird_artist_1', 'letrin_bucket');
  });

  it('doit retourner une erreur 400 si l\'oiseau n\'a pas assez de plumes ou vinyles', async () => {
    // Le mock simule le rejet du service
    vi.mocked(EconomyService.unlockFeature).mockRejectedValue(new Error('Ressources insuffisantes pour forger cet outil.'));

    const req = new Request('http://localhost/api/economy/unlock', {
      method: 'POST',
      body: JSON.stringify({ featureId: 'samplotek_track_5' })
    });

    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Ressources insuffisantes pour forger cet outil.');
  });
});