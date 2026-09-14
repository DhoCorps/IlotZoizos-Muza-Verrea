import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { NextRequest } from 'next/server';

vi.mock('@/modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

// Adaptation du mock sur generateKey au lieu de generateStructuredKey
vi.mock('@/modules/storage/storage.service', () => ({
  storageService: { 
    generateKey: vi.fn(), 
    uploadFile: vi.fn().mockResolvedValue('https://cdn/sample.mp3') 
  }
}));

// Mock de l'Orchestrateur sous forme de VRAIE CLASSE avec importOriginal
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

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => handler(req, context, { uid: 'bird_dj', capabilities: [] })
}));

describe('API SamploTek - Upload (POST)', () => {
  beforeEach(() => {
      vi.clearAllMocks();
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