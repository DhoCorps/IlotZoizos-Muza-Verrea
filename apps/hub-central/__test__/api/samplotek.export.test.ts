import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/export/route';
import { SampleModel, PartitaModel, UniversalMediaRegistry } from '@ilot/infrastructure';

// 🛡️ MOCK GLOBAL : Next Cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK DE L'INFRASTRUCTURE (Support du chaînage .lean())
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SampleModel: {
      find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    },
    PartitaModel: {
      findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      create: vi.fn().mockImplementation((doc) => Promise.resolve(doc)),
    },
    UniversalMediaRegistry: {
      indexItem: vi.fn().mockResolvedValue(true),
    }
  };
});

// 🛡️ MOCK DU GARDE D'AURA
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_dj_1', slug: 'dj-bird', capabilities: ['*'] });
  },
}));

describe('POST /api/studio/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit exporter le projet et restreindre les permissions si un sample est bloqué', async () => {
    // On simule 2 samples dans la base. Le sample_2 interdit la diffusion Showcase et Radio.
    const mockSamples = [
      { uid: 'samp_1', permissions: { allowRadio: true, allowBlindTest: true, allowShowcase: true } },
      { uid: 'samp_2', permissions: { allowRadio: false, allowBlindTest: true, allowShowcase: false } }
    ];

    vi.mocked(SampleModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockSamples)
    } as any);

    const payload = {
      title: 'Ma Première Symphonie E-Jay',
      bpm: 125,
      tracks: [
        { id: 1, sampleUid: 'samp_1', volume: 0.8, isMuted: false },
        { id: 2, sampleUid: 'samp_2', volume: 0.5, isMuted: false }
      ]
    };

    const req = new Request('http://localhost/api/studio/export', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    
    // Le calcul d'intersection doit avoir fait son travail : false l'emporte !
    expect(json.data.permissions.allowShowcase).toBe(false);
    expect(json.data.permissions.allowRadio).toBe(false);
    expect(json.data.permissions.allowBlindTest).toBe(true);

    // Puisque le showcase est interdit, le Registre Universel ne doit PAS avoir été appelé
    expect(UniversalMediaRegistry.indexItem).not.toHaveBeenCalled();
    expect(PartitaModel.create).toHaveBeenCalled();
  });
});