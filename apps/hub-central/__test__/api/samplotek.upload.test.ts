import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/upload/route';
import { SampleModel } from '@ilot/infrastructure';

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
      findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      create: vi.fn().mockImplementation((doc) => Promise.resolve(doc)),
    }
  };
});

// 🛡️ MOCK DU GARDE D'AURA
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_sampler_1', slug: 'bird-sampler', capabilities: ['*'] });
  },
}));

// 🛡️ MOCK DE STORAGE SERVICE
vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mock-sample-key'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://mock-url.com/sample.mp3', key: 'mock-sample-key' }),
  },
}));

// 🛡️ MOCK DE RATE LIMITER
vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('POST /api/samples/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit téléverser un sample, valider les métadonnées et le sédimenter', async () => {
    const mockFile = new File(['audio-content'], 'kick.mp3', { type: 'audio/mpeg' });
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('title', 'Kick Canopée');
    formData.append('tempoBpm', '120');
    formData.append('musicalKey', 'C minor');
    formData.append('style', 'Techno');
    formData.append('allowRadio', 'true');

    // 🎯 ESPIONNAGE STRICT : Résout proprement le FormData sous Node/Vitest
    const req = new Request('http://localhost/api/samples/upload', {
      method: 'POST',
    });
    vi.spyOn(req, 'formData').mockResolvedValue(formData);

    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Kick Canopée');
    expect(json.data.tempoBpm).toBe(120);
    expect(SampleModel.create).toHaveBeenCalled();
  });
});