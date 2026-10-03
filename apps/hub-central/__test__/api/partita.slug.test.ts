// Fichier : apps/hub-central/app/api/partita/[slug]/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/partita/[slug]/route';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';
import { getCachedPartitaDetails } from '@/lib/cache/partita.cache';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, defaultMessage: string) => {
    return NextResponse.json({ error: defaultMessage }, { status: 500 });
  }
}));

vi.mock('@/lib/cache/partita.cache', () => ({
  getCachedPartitaDetails: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  PartitaModel: {},
  findEntityBySlugOrUid: vi.fn(),
}));

declare global {
  var __mockUser: { uid: string; capabilities: string[]; [key: string]: unknown; } | undefined;
}

describe('API Partita - Entité Spécifique (GET / PUT / DELETE) avec SEO & Sceau', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(PartitaOrchestrator.prototype, 'updatePartita').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: { uid: 'part_123', slug: 'opus-1', title: 'Opus 1 Modifié' } as any,
      neo4j: {}
    });

    vi.spyOn(PartitaOrchestrator.prototype, 'disintegratePartita').mockResolvedValue({
      success: true,
      purgedCount: 1,
      filesToDelete: []
    });
  });

  describe('GET', () => {
    it('✅ doit retourner 404 si la partition n\'existe pas', async () => {
      vi.mocked(getCachedPartitaDetails).mockResolvedValueOnce(null);
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/partita/inconnu');
      const res = await GET(req, { params: Promise.resolve({ slug: 'inconnu' }) } as any);
      expect(res.status).toBe(404);
    });

    it('✅ doit retourner la partition publique', async () => {
      // 🚀 Ajout du "as any" pour satisfaire le typage strict attendu par le cache/Mongoose
      vi.mocked(getCachedPartitaDetails).mockResolvedValueOnce({
        uid: 'part_123',
        status: 'PUBLISHED',
        authorUid: 'another_bird'
      } as any); 

      const req = new NextRequest('http://localhost:3000/api/partita/opus-1');
      const res = await GET(req, { params: Promise.resolve({ slug: 'opus-1' }) } as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.uid).toBe('part_123');
    });
  });

  describe('PUT', () => {
    it('❌ doit rejeter la mise à jour avec des champs invalides (400)', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };
      
      const req = new NextRequest('http://localhost:3000/api/partita/opus-1', {
        method: 'PUT', body: JSON.stringify({ title: '' }) // Titre vide invalide
      });

      const res = await PUT(req, { params: Promise.resolve({ slug: 'opus-1' }) } as any);
      expect(res.status).toBe(400);
    });

    it('✅ doit accepter la mise à jour (y compris SEO et Filiation) (200)', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'part_123', authorUid: 'bird_author' } as any);

      const req = new NextRequest('http://localhost:3000/api/partita/opus-1', {
        method: 'PUT', 
        body: JSON.stringify({ 
          title: 'Opus 1 Modifié',
          seo: { metaTitle: 'Opus 1 - Version 2' },
          cryptoSeal: {
            copyrightMetadata: {
              role: 'SUBLIMATOR',
              isExclusiveIlot: true
            }
          }
        })
      });

      const res = await PUT(req, { params: Promise.resolve({ slug: 'opus-1' }) } as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.mongo.title).toBe('Opus 1 Modifié');

      // Vérifie l'appel à l'Orchestrateur
      expect(PartitaOrchestrator.prototype.updatePartita).toHaveBeenCalledWith(
        'part_123',
        expect.objectContaining({
          title: 'Opus 1 Modifié',
          seo: expect.objectContaining({ metaTitle: 'Opus 1 - Version 2' }),
          cryptoSeal: expect.objectContaining({
            copyrightMetadata: expect.objectContaining({ role: 'SUBLIMATOR', isExclusiveIlot: true })
          })
        }),
        expect.objectContaining({ actorUid: 'bird_author' })
      );

      // Invalidation en cascade
      expect(revalidateTag).toHaveBeenCalledWith('partitas');
      expect(revalidateTag).toHaveBeenCalledWith('partita-opus-1');
    });
  });

  describe('DELETE', () => {
    it('✅ doit dissoudre la partition avec succès (200)', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'part_123', authorUid: 'bird_author' } as any);

      const req = new NextRequest('http://localhost:3000/api/partita/opus-1', { method: 'DELETE' });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'opus-1' }) } as any);
      
      expect(res.status).toBe(200);
      expect(PartitaOrchestrator.prototype.disintegratePartita).toHaveBeenCalledWith('part_123', expect.anything());
    });
  });
});