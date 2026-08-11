import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/upload/route';
import { SampleModel } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { NextRequest } from 'next/server';

// 🛡️ MOCK GLOBAL : Next Cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK DU GARDE D'AURA
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_sampler_1', slug: 'bird-sampler', capabilities: ['*'] });
  },
}));

// 🛡️ MOCK DE RATE LIMITER
vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('POST /api/samples/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🎯 ESPIONNAGE ACTIF DE STORAGE SERVICE
    vi.spyOn(storageService, 'generateStructuredKey').mockReturnValue('mock-sample-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://mock-url.com/sample.mp3',
      key: 'mock-sample-key',
    } as any);

    // 🎯 ESPIONNAGE ACTIF DE MONGOOSE (SampleModel)
    vi.spyOn(SampleModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    vi.spyOn(SampleModel, 'create').mockImplementation((doc: any) => Promise.resolve({
      ...doc,
      _id: 'mock_mongo_id_123',
    }) as any);
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

    // 🎯 LOI DU MULTIPART SOUVERAIN
    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Kick Canopée');
    expect(json.data.tempoBpm).toBe(120);
    expect(SampleModel.create).toHaveBeenCalled();
  });
});