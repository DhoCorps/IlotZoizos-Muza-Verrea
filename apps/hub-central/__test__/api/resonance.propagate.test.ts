import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/resonance/propagate/route'; // Assure-toi que le chemin d'import est exact
import { NextRequest } from 'next/server';
import { PropagationOrchestrator } from '@ilot/shared-core';
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
// TESTS : ROUTE API (Propagation)
// ==========================================
describe('Route API POST /api/resonance/propagate', () => {
  // On déclare l'espion (spy) pour pouvoir le manipuler dans les tests
  let propagateArtifactSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // La Magie : On espionne directement la méthode de la classe avant qu'elle ne soit appelée par la route
    propagateArtifactSpy = vi.spyOn(PropagationOrchestrator.prototype, 'propagateArtifact');
  });

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost/api/resonance/propagate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('🔴 doit rejeter (400) si le payload est incomplet (Zod Shield)', async () => {
    const req = createMockRequest({
      artifactUid: '123e4567-e89b-12d3-a456-426614174000',
      // artifactType manquant
      scope: 'GLOBAL'
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Paramètres de propagation invalides');
    expect(data.details.fieldErrors).toHaveProperty('artifactType');
  });

  it('🔴 doit rejeter (400) un partage TARGETED sans destinataires (Règle d\'or du Kosmos)', async () => {
    const req = createMockRequest({
      artifactUid: '123e4567-e89b-12d3-a456-426614174000',
      artifactType: 'BLOG',
      scope: 'TARGETED',
      receiverUids: [] // Interdit car vide
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.details.fieldErrors).toHaveProperty('receiverUids');
  });

  it('🟢 doit orchestrer un partage GLOBAL avec succès', async () => {
    const req = createMockRequest({
      artifactUid: '123e4567-e89b-12d3-a456-426614174000',
      artifactType: 'BLOG',
      scope: 'GLOBAL'
    });

    // Utilisation du SpyOn défini dans le beforeEach
    propagateArtifactSpy.mockResolvedValueOnce({
      success: true,
      mongo: { uid: 'share_789', scope: 'GLOBAL' }
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toContain('ensemble du réseau');
    expect(data.data.uid).toBe('share_789');
    
    // Vérification de l'invalidation de cache en cascade
    expect(revalidateTag).toHaveBeenCalledWith('propagation');
    expect(revalidateTag).toHaveBeenCalledWith('propagation-artifact-123e4567-e89b-12d3-a456-426614174000');
    expect(revalidateTag).toHaveBeenCalledWith('propagation-user-oiseau_123');
    expect(revalidateTag).toHaveBeenCalledWith('entity-123e4567-e89b-12d3-a456-426614174000');
  });

  it('🟢 doit orchestrer un partage TARGETED avec succès', async () => {
    const req = createMockRequest({
      artifactUid: '123e4567-e89b-12d3-a456-426614174000',
      artifactType: 'LYRIKA',
      scope: 'TARGETED',
      receiverUids: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
      customMessage: 'Regarde ça !'
    });

    propagateArtifactSpy.mockResolvedValueOnce({
      success: true,
      mongo: { uid: 'share_790', scope: 'TARGETED' }
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toContain('contacts ciblés');
  });

  it('🔴 doit renvoyer l\'erreur de l\'orchestrateur en cas d\'échec', async () => {
    const req = createMockRequest({
      artifactUid: '123e4567-e89b-12d3-a456-426614174000',
      artifactType: 'BLOG',
      scope: 'GLOBAL'
    });

    propagateArtifactSpy.mockRejectedValueOnce({
      status: 403,
      message: "L'auteur a interdit la propagation de cette œuvre."
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain("L'auteur a interdit la propagation de cette œuvre.");
  });
});