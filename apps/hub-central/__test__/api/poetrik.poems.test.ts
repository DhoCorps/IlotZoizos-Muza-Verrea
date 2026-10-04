// apps/hub-central/__test__/api/poetrik.poems.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/poetrik/poems/route';
import { NextRequest } from 'next/server';
import { PoemModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES (Correction Vitest Hoisting & ES6 Class)
// -------------------------------------------------------------------------

// 1. L'utilisation de vi.hoisted garantit que le mock est disponible avant les imports
const { mockSealPoem } = vi.hoisted(() => ({
  mockSealPoem: vi.fn()
}));

// 2. Mock propre d'une classe ES6 pour intercepter "new PoetrikOrchestrator()"
vi.mock('@ilot/shared-core', () => ({
  PoetrikOrchestrator: class {
    sealPoem = mockSealPoem;
  }
}));

vi.mock('@ilot/infrastructure', () => ({
  PoemModel: {
    find: vi.fn()
  }
}));

// Mock des gardes d'authentification pour simuler un Oiseau connecté
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: any) => async (req: any, ctx: any) => handler(req, ctx, { uid: 'guest' }),
  withAura: (handler: any) => async (req: any, ctx: any) => handler(req, ctx, { uid: 'bird_poet_1', capabilities: ['member:write'] }),
  handleRouteError: (err: any) => new Response(JSON.stringify({ error: err.message }), { status: 500 })
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn()
}));

describe('Route API : Atelier Poetrik (GET / POST /api/poetrik/poems)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // ⛲ LA FONTAINE DES VERS (GET)
  // ==========================================
  describe('GET - La Fontaine des Vers', () => {
    it('🟢 doit renvoyer (200) la liste des poèmes publics', async () => {
      const mockPoems = [
        { uid: 'poem_1', title: 'Aube', content: 'Le jour se lève.', status: 'PUBLISHED', visibility: 'PUBLIC' },
        { uid: 'poem_2', title: 'Crépuscule', content: 'Le jour se couche.', status: 'PUBLISHED', visibility: 'PUBLIC' }
      ];

      // Construction de la chaîne Mongoose (find -> sort -> limit -> lean)
      const mockLean = vi.fn().mockResolvedValue(mockPoems);
      const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
      const mockSort = vi.fn().mockReturnValue({ limit: mockLimit });
      vi.mocked(PoemModel.find).mockReturnValue({ sort: mockSort } as any);

      const req = new NextRequest('http://localhost:3000/api/poetrik/poems?limit=10', { method: 'GET' });
      const res = await GET(req, { params: {} });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(2);
      expect(PoemModel.find).toHaveBeenCalledWith({ status: 'PUBLISHED', visibility: 'PUBLIC' });
    });
  });

  // ==========================================
  // 🪶 SCELLER UN POÈME (POST)
  // ==========================================
  describe('POST - Sceller et Sédimenter un Poème', () => {
    it('🔴 doit rejeter (400) si le format JSON est invalide ou des champs essentiels manquent', async () => {
      // Titre manquant, la validation Zod doit échouer
      const invalidPayload = { content: 'Juste des mots...' };
      
      const req = new NextRequest('http://localhost:3000/api/poetrik/poems', {
        method: 'POST',
        body: JSON.stringify(invalidPayload)
      });

      const res = await POST(req, { params: {} });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("L'encre bave");
    });

    it('🟢 doit sédimenter un poème, appeler l\'orchestrateur et renvoyer (201)', async () => {
      const validPayload = {
        title: 'Chant de la Canopée',
        content: 'Vents et murmures...',
        format: 'FREE_VERSE',
        settings: { catharsisVeil: true }
      };

      // 🚀 Utilisation directe du mock hoisted !
      mockSealPoem.mockResolvedValueOnce({
        success: true,
        status: 'sealed',
        digitalSignature: 'hash_sha256_mock',
        reward: { currency: 'PARCHEMIN', amount: 15 }
      });

      const req = new NextRequest('http://localhost:3000/api/poetrik/poems', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });

      const res = await POST(req, { params: {} });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.digitalSignature).toBe('hash_sha256_mock');
      expect(json.data.reward.amount).toBe(15);
      
      // Vérifie que l'auteur est bien forcé depuis le token JWT/Session
      expect(mockSealPoem).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Chant de la Canopée', authorUid: 'bird_poet_1' }),
        expect.objectContaining({ actorUid: 'bird_poet_1' })
      );
    });

    it('🔴 doit renvoyer l\'erreur de l\'orchestrateur si la sédimentation échoue (ex: 500)', async () => {
      const validPayload = { title: 'Erreur', content: 'Ceci va échouer.' };

      // 🚀 Utilisation directe du mock hoisted !
      mockSealPoem.mockRejectedValueOnce({
        status: 500,
        message: 'Panne de la Matrice Neo4j.'
      });

      const req = new NextRequest('http://localhost:3000/api/poetrik/poems', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });

      const res = await POST(req, { params: {} });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Panne de la Matrice Neo4j.');
    });
  });
});