import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/media/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { NextRequest } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true })
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'oiseau_666', slug: 'amiga-mia', capabilities: [] };
    return await handler(req, context, mockUser);
  },
  withRateLimit: (_actionKey: string, _max: number, _window: number, handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'oiseau_666', slug: 'amiga-mia', capabilities: [] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateKey: vi.fn().mockReturnValue('media/DHO/AUDIO_STEM/oiseau_666/123_lead.wav'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot/lead.wav' }),
    extractKeyFromUrl: vi.fn().mockImplementation((url: string) => {
      if (url && (url.includes('etranger') || url.includes('foreign') || url.includes('intrus'))) {
        return '';
      }
      return 'media/DHO/AUDIO_STEM/oiseau_666/123_lead.wav';
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true })
  }
}));

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

describe('API Route: /api/media/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  describe('POST : Téléversement', () => {
    it('devrait refuser une requête sans fichier ni payload', async () => {
      const request = new NextRequest('http://localhost/api/media/upload', {
        method: 'POST',
      });
      // Mock direct de formData pour simuler le vide
      vi.spyOn(request, 'formData').mockResolvedValueOnce(new Map() as unknown as FormData);

      const response = await POST(request, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Fichier ou métadonnées manquantes');
    });

    it('devrait rejeter un payload qui ne respecte pas le Contrat Zod', async () => {
      const mockFile = {
        arrayBuffer: async () => new ArrayBuffer(8),
        name: 'test.png',
        type: 'image/png',
        size: 8
      };

      const request = new NextRequest('http://localhost/api/media/upload', {
        method: 'POST',
      });

      // Simulation parfaite d'un FormData contenant un fichier et un payload invalide
      const mockFormData = {
        get: (key: string) => {
          if (key === 'file') return mockFile;
          if (key === 'payload') return JSON.stringify({ sourceApp: 'NOT_A_REAL_APP' });
          return null;
        }
      };
      vi.spyOn(request, 'formData').mockResolvedValueOnce(mockFormData as unknown as FormData);

      const response = await POST(request, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Contrat souverain invalide');
    });

    it('devrait uploader le fichier, forger le Sceau et appeler l\'Orchestrateur avec invalidation en cascade', async () => {
      const mockFile = {
        arrayBuffer: async () => new ArrayBuffer(16),
        name: 'lead.wav',
        type: 'audio/wav',
        size: 16
      };

      const validPayload = {
        sourceApp: 'DHO',
        type: 'AUDIO_STEM',
        title: { fr: 'L\'Empire des Je(ux)' },
        rights: { allow_remix: true }
      };

      const request = new NextRequest('http://localhost/api/media/upload', {
        method: 'POST',
      });

      // Simulation parfaite d'un FormData valide
      const mockFormData = {
        get: (key: string) => {
          if (key === 'file') return mockFile;
          if (key === 'payload') return JSON.stringify(validPayload);
          return null;
        }
      };
      vi.spyOn(request, 'formData').mockResolvedValueOnce(mockFormData as unknown as FormData);

      const response = await POST(request, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.mediaId).toBe('media_123');
      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);

      const { revalidateTag } = await import('next/cache');
      expect(revalidateTag).toHaveBeenCalledWith('universal-media');
      expect(revalidateTag).toHaveBeenCalledWith('media');
      expect(revalidateTag).toHaveBeenCalledWith('media-DHO');
      expect(revalidateTag).toHaveBeenCalledWith('media-oiseau-oiseau_666');
    });
  });

  describe('DELETE : Purge', () => {
    it('devrait normaliser la clé, purger S3 et appeler l\'Orchestrateur pour le nettoyage avec invalidation', async () => {
      const request = new NextRequest(
        'http://localhost/api/media/upload?mediaId=media_1&url=http://cloud.com/media/DHO/AUDIO_STEM/oiseau_666/123_lead.wav',
        { method: 'DELETE' }
      );

      const response = await DELETE(request, { params: Promise.resolve({}) });
      const json = await response.json();
      
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(storageService.extractKeyFromUrl).toHaveBeenCalledWith('http://cloud.com/media/DHO/AUDIO_STEM/oiseau_666/123_lead.wav');
      expect(storageService.deleteFile).toHaveBeenCalledWith('media/DHO/AUDIO_STEM/oiseau_666/123_lead.wav');

      const { revalidateTag } = await import('next/cache');
      expect(revalidateTag).toHaveBeenCalledWith('universal-media');
      expect(revalidateTag).toHaveBeenCalledWith('media');
      expect(revalidateTag).toHaveBeenCalledWith('media-oiseau-oiseau_666');
    });
  });
});