import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/resonance/comments/route'; // Assure-toi que le chemin d'import pointe bien vers ton fichier route.ts
import { NextRequest } from 'next/server';
import { UniversalCommentOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// ==========================================
// MOCKS (Inchiffrés et Sécurisés)
// ==========================================

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn()
}));

// Mock du guard "withAura" pour injecter automatiquement currentUser
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = { uid: 'oiseau_123', capabilities: [] };
    return handler(req, context, mockUser);
  },
  handleRouteError: vi.fn((err, msg) => {
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500 });
  })
}));

// ==========================================
// TESTS : ROUTE API (Universal Comments)
// ==========================================
describe('Route API POST /api/resonance/comments', () => {
  // On déclare l'espion (spy) pour pouvoir le manipuler dans les tests
  let fosterCommentSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // La Magie : On espionne directement la méthode de la classe avant qu'elle ne soit appelée par la route
    fosterCommentSpy = vi.spyOn(UniversalCommentOrchestrator.prototype, 'fosterComment');
  });

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost/api/resonance/comments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('🔴 doit rejeter (400) si le payload est incomplet ou invalide (Zod Shield)', async () => {
    const req = createMockRequest({
      targetUid: 'oeuvre_456',
      // targetType manquant
      content: 'Ceci est un test'
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Paramètres de résonance invalides');
    expect(data.details.fieldErrors).toHaveProperty('targetType');
  });

  it('🔴 doit rejeter (400) si le contenu est vide', async () => {
    const req = createMockRequest({
      targetUid: 'oeuvre_456',
      targetType: 'BLOG',
      content: '' // Interdit par Zod
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.details.fieldErrors).toHaveProperty('content');
  });

  it('🟢 doit orchestrer l\'écho avec succès et informer si c\'est un Jackpot standard', async () => {
    const req = createMockRequest({
      targetUid: 'oeuvre_456',
      targetType: 'BLOG',
      content: 'Une œuvre qui résonne avec la canopée.'
    });

    // Utilisation du SpyOn défini dans le beforeEach
    fosterCommentSpy.mockResolvedValueOnce({
      success: true,
      isJackpot: false,
      mongo: { uid: 'comment_789', content: 'Une œuvre qui résonne avec la canopée.' }
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.isJackpot).toBe(false);
    expect(data.data.uid).toBe('comment_789');
    
    // Vérification de l'invalidation de cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('comments');
    expect(revalidateTag).toHaveBeenCalledWith('comments-oeuvre_456');
    expect(revalidateTag).toHaveBeenCalledWith('entity-oeuvre_456');
  });

  it('🟢 🌟 doit renvoyer un message stellaire si l\'Oiseau décroche la Faveur du Kosmos', async () => {
    const req = createMockRequest({
      targetUid: 'oeuvre_456',
      targetType: 'LYRIKA',
      content: 'Magistral.'
    });

    // Utilisation du SpyOn défini dans le beforeEach
    fosterCommentSpy.mockResolvedValueOnce({
      success: true,
      isJackpot: true, // Le Gacha est tombé !
      mongo: { uid: 'comment_790' }
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.isJackpot).toBe(true);
    expect(data.message).toContain('BINGO ! Faveur du Kosmos accordée');
  });

  it('🔴 doit renvoyer l\'erreur de l\'orchestrateur si la condition ([:REACTED_TO]) n\'est pas remplie', async () => {
    const req = createMockRequest({
      targetUid: 'oeuvre_456',
      targetType: 'BLOG',
      content: 'Je tente de parler sans amour.'
    });

    // On simule une erreur levée par l'orchestrateur via le spy
    fosterCommentSpy.mockRejectedValueOnce({
      status: 403,
      message: "Le droit de critiquer s'achète par un acte d'amour."
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Le droit de critiquer s'achète par un acte d'amour.");
  });
});