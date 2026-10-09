import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { SamplotekOrchestrator } from '@ilot/shared-core'; // Import direct pour le spyOn

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = (global as any).__mockUser || { uid: 'bird_dj', capabilities: [] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: Function) => async (req: NextRequest, context: unknown) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, error: 'Trop de téléversements.' }, { status: 429 });
    }
    const mockUser = (global as any).__mockUser || { uid: 'bird_dj', capabilities: [] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500 });
  }
}));

vi.mock('@/modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: { 
    generateKey: vi.fn(() => 'hub-central/fr/projects/samp_123/audio_sample/kick.wav'), 
    uploadFile: vi.fn().mockResolvedValue('https://cdn/sample.mp3'),
    extractKeyFromUrl: vi.fn(() => 'mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  }
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('API SamploTek - Upload (POST)', () => {
  let fosterSampleSpy: any;

  beforeEach(() => {
      vi.clearAllMocks();
      delete (global as any).__mockUser;
      
      // 🛡️ CORRECTION ICI : Remplacement simple et infaillible de la méthode de classe
      fosterSampleSpy = vi.spyOn(SamplotekOrchestrator.prototype, 'fosterSample').mockResolvedValue({ 
        success: true, 
        mongo: { uid: 'samp_123', title: 'Kick' },
        status: 'success'
      } as any);
  });

  it('🟢 doit traiter le FormData, uploader sur R2 et déléguer à l\'Orchestrateur avec le Sceau Cryptographique', async () => {
    const req = new NextRequest('http://localhost/api/samplotek/upload', { method: 'POST' });
    
    (req as unknown as { formData: () => Promise<FormData> }).formData = vi.fn().mockResolvedValue({
      get: (key: string) => {
        if (key === 'file') return new File(['audio content'], 'kick.wav', { type: 'audio/wav' });
        if (key === 'title') return 'Kick Lourd';
        if (key === 'copyrightRole') return 'CREATOR'; 
        return null;
      }
    } as unknown as FormData);
    
    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Kick');
    expect(storageService.uploadFile).toHaveBeenCalled();

    expect(fosterSampleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Kick Lourd',
        cryptoSeal: expect.objectContaining({
          digitalSignature: expect.any(String),
          copyrightMetadata: expect.objectContaining({ role: 'CREATOR' })
        })
      }),
      expect.anything()
    );
  });
});