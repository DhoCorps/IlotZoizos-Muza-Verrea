import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/media/upload/route';
import { storageService } from '@/modules/storage/storage.service';

// 🪡 Neutralisation de Next.js Cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true })
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateKey: vi.fn().mockReturnValue('media/DHO/AUDIO_STEM/oiseau_666/123_lead.wav'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot/lead.wav' }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue({ success: true })
  }
}));

// 🪡 Mock étanche sous forme de fonction constructeur pure (zéro risque d'undefined)
vi.mock('@ilot/shared-core', () => ({
  UniversalMediaOrchestrator: function() {
    return {
      fosterMedia: vi.fn().mockResolvedValue({
        success: true,
        status: 'success',
        mongo: { mediaId: 'media_123', creatorUid: 'oiseau_666', fileUrl: 'https://cdn.ilot/lead.wav' },
        neo4j: {}
      }),
      disintegrateMedia: vi.fn().mockResolvedValue({ success: true, purgedCount: 1 })
    };
  },
  IlotError: class extends Error {
    status: number;
    constructor(msg: string, code: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
  TransactionManager: {
    execute: vi.fn()
  }
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'oiseau_666', slug: 'amiga-mia', capabilities: [] });
  }
}));

describe('API Route: /api/media/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST : Téléversement', () => {
    it('devrait refuser une requête sans fichier ni payload', async () => {
      const formData = new FormData(); 
      const request = {
        headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
        formData: vi.fn().mockResolvedValue(formData)
      } as any;

      const response = await POST(request, {} as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Fichier ou métadonnées manquantes');
    });

    it('devrait rejeter un payload qui ne respecte pas le Contrat Zod', async () => {
      const formData = new FormData();
      const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
      formData.append('file', mockFile);
      formData.append('payload', JSON.stringify({ sourceApp: 'NOT_A_REAL_APP' })); 

      const request = {
        headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
        formData: vi.fn().mockResolvedValue(formData)
      } as any;

      const response = await POST(request, {} as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Contrat souverain invalide');
    });

    it('devrait uploader le fichier, forger le Sceau et appeler l\'Orchestrateur', async () => {
      const formData = new FormData();
      const mockFile = new File(['audio data'], 'lead.wav', { type: 'audio/wav' });
      formData.append('file', mockFile);
      
      const validPayload = {
        sourceApp: 'DHO',
        type: 'AUDIO_STEM',
        title: { fr: 'L\'Empire des Je(ux)' },
        rights: { allow_remix: true }
      };
      formData.append('payload', JSON.stringify(validPayload));

      const request = {
        headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
        formData: vi.fn().mockResolvedValue(formData)
      } as any;

      const response = await POST(request, {} as any);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.mediaId).toBe('media_123');
      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE : Purge', () => {
    it('devrait purger S3 et appeler l\'Orchestrateur pour le nettoyage', async () => {
      const request = {
        url: 'http://localhost/api/media/upload?mediaId=media_1&url=http://cloud.com/media/DHO/AUDIO_STEM/oiseau_666/123_lead.wav'
      } as any;

      const response = await DELETE(request, {} as any);
      const json = await response.json();
      
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(storageService.deleteFile).toHaveBeenCalled();
    });
  });
});