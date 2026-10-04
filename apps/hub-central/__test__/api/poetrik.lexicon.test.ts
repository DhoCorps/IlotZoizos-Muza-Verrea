// apps/hub-central/__test__/api/poetrik.lexicon.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/poetrik/lexicon/route';
import { LexiconEntryModel } from '@ilot/infrastructure';

// 1. MOCK DE NEXT/CACHE POUR EVITER L'ERREUR DE STATIC GENERATION STORE
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  LexiconEntryModel: {
    find: vi.fn(),
  },
}));

// 2. MOCK HOISTED DE L'ORCHESTRATEUR (La Voie de l'Architecte)
const { mockFosterLexiconEntry } = vi.hoisted(() => ({
  mockFosterLexiconEntry: vi.fn()
}));

vi.mock('@ilot/shared-core', () => ({
  PoetrikOrchestrator: class {
    fosterLexiconEntry = mockFosterLexiconEntry;
  }
}));

// Mock des gardes d'API
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: any) => async (req: any, ctx: any) => handler(req, ctx, { uid: 'guest' }),
  withAura: (handler: any) => async (req: any, ctx: any) => handler(req, ctx, { uid: 'architect_1', capabilities: ['*'] }),
  handleRouteError: (err: any) => new Response(JSON.stringify({ error: err.message }), { status: 500 })
}));

describe('API Route /api/poetrik/lexicon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - Recensement lexical', () => {
    it('🟢 doit récupérer la liste des mots avec succès (limité à 20 pour la perf)', async () => {
      const mockLean = vi.fn().mockResolvedValue([{ uid: 'lex_fr_chat', word: 'chat' }]);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      vi.mocked(LexiconEntryModel.find).mockReturnValue({ limit: mockLimit } as any);

      const req = new Request('http://localhost/api/poetrik/lexicon?lang=fr');
      const res = await GET(req as any, {} as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].word).toBe('chat');
    });
  });

  describe('POST - Ingestion d\'un mot', () => {
    it('🔴 doit rejeter (400) si les données essentielles manquent (Validation Zod)', async () => {
      const req = new Request('http://localhost/api/poetrik/lexicon', {
        method: 'POST',
        body: JSON.stringify({ word: 'chat' }) // Manque IPA et Code
      });

      const res = await POST(req as any, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('nécessite au moins');
    });

    it('🟢 doit sédimenter un mot avec succès si l\'aura est valide', async () => {
      mockFosterLexiconEntry.mockResolvedValueOnce({
        success: true,
        mongo: { uid: 'lex_fr_chat', word: 'chat' }
      });

      const req = new Request('http://localhost/api/poetrik/lexicon', {
        method: 'POST',
        body: JSON.stringify({
          word: 'chat',
          phoneticIpa: '/ʃa/',
          languageCode: 'fr',
          syllableCount: 1,
          definitions: { fr: 'Félin domestique' },
          partOfSpeech: 'noun'
        })
      });

      const res = await POST(req as any, {} as any);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.word).toBe('chat');
    });
  });
});