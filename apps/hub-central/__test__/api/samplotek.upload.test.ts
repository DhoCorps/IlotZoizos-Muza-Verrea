import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

// Mocks unifiés des api-guards incluant withRateLimit et withAura
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'bird_dj', capabilities: [] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: any) => async (req: any, context: any) => {
    const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
    if (rateLimitResult && rateLimitResult.allowed === false) {
      return NextResponse.json({ success: false, error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }
    const mockUser = global.__mockUser || { uid: 'bird_dj', capabilities: [] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

// Adaptation du mock sur generateKey et uploadFile
vi.mock('@/modules/storage/storage.service', () => ({
  storageService: { 
    generateKey: vi.fn(() => 'hub-central/fr/projects/samp_123/audio_sample/kick.wav'), 
    uploadFile: vi.fn().mockResolvedValue('https://cdn/sample.mp3'),
    extractKeyFromUrl: vi.fn(() => 'mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  }
}));

// Mock de l'Orchestrateur sous forme de vraie classe avec importOriginal
vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SamplotekOrchestrator: class {
      fosterSample = vi.fn().mockResolvedValue({ 
        success: true, 
        mongo: { uid: 'samp_123', title: 'Kick' } 
      });
    }
  };
});

declare global {
  var __mockUser: any;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('API SamploTek - Upload (POST)', () => {
  beforeEach(() => {
      vi.clearAllMocks();
      delete (global as any).__mockUser;
  });

  it('🟢 doit traiter le FormData, uploader sur R2 et déléguer à l\'Orchestrateur', async () => {
    const req = new NextRequest('http://localhost/api/samplotek/upload', { method: 'POST' });
    
    req.formData = vi.fn().mockResolvedValue({
      get: (key: string) => {
        if (key === 'file') return new File(['audio content'], 'kick.wav', { type: 'audio/wav' });
        if (key === 'title') return 'Kick Lourd';
        return null;
      }
    });
    
    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Kick');
    expect(storageService.uploadFile).toHaveBeenCalled();
  });
});